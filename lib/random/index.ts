/**
 * Seeded randomness for SPIN//BUILD.
 *
 * Everything that decides an idea goes through an `Rng` created from a seed
 * string, so the same recipe always produces the same idea. `randomSeed()` is
 * the single non-deterministic entry point.
 */

export interface Rng {
  readonly seed: string;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Weighted pick. Non-positive/NaN weights never win unless every weight is non-positive (then uniform). */
  weighted<T>(items: readonly T[], weight: (item: T, i: number) => number): T;
  shuffle<T>(items: readonly T[]): T[];
  /** n distinct items (or all of them if n ≥ length), in random order. */
  sample<T>(items: readonly T[], n: number): T[];
  /** Independent deterministic sub-stream; same (seed, label) ⇒ same stream. */
  fork(label: string): Rng;
}

/** 32-bit unsigned string hash (cyrb53-derived mixing). */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** sfc32 — small, fast, well-distributed 32-bit generator. */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const seedStr = String(seed);
  const next = sfc32(
    hashString(`${seedStr}#a`),
    hashString(`${seedStr}#b`),
    hashString(`${seedStr}#c`),
    hashString(`${seedStr}#d`),
  );
  // Warm up so similar seeds diverge immediately.
  for (let i = 0; i < 12; i++) next();

  const rng: Rng = {
    seed: seedStr,
    next,
    int(min, max) {
      const lo = Math.ceil(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error("rng.pick: empty list");
      return items[Math.floor(next() * items.length)];
    },
    weighted(items, weight) {
      if (items.length === 0) throw new Error("rng.weighted: empty list");
      const weights = items.map((it, i) => {
        const w = weight(it, i);
        return Number.isFinite(w) && w > 0 ? w : 0;
      });
      const total = weights.reduce((s, w) => s + w, 0);
      if (total <= 0) return rng.pick(items);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      // Floating-point edge: return the last positively-weighted item.
      for (let i = items.length - 1; i >= 0; i--) if (weights[i] > 0) return items[i];
      return items[items.length - 1];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    sample(items, n) {
      return rng.shuffle(items).slice(0, Math.max(0, Math.min(n, items.length)));
    },
    fork(label) {
      return createRng(`${seedStr}/${label}`);
    },
  };
  return rng;
}

/** Fresh random seed: 7 base36 chars. The only non-deterministic source in the engine. */
export function randomSeed(): string {
  let a: number;
  let b: number;
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint32Array(2);
    c.getRandomValues(buf);
    a = buf[0];
    b = buf[1];
  } else {
    a = Math.floor(Math.random() * 0xffffffff);
    b = Math.floor(Math.random() * 0xffffffff);
  }
  // 53 bits of entropy folded into 36^7 (= 78,364,164,096) values.
  const n = (a * 2 ** 21 + (b >>> 11)) % 78_364_164_096;
  return n.toString(36).padStart(7, "0");
}

/**
 * How at-home an entry of `weirdness` feels at a given chaos level.
 * Bell curve (σ ≈ 22) with a small floor so nothing is impossible.
 */
export function chaosAffinity(weirdness: number, chaos: number): number {
  const d = weirdness - chaos;
  const sigma = 22;
  return Math.max(0.02, Math.exp(-(d * d) / (2 * sigma * sigma)));
}

const DAY_MS = 86_400_000;
const DAILY_EPOCH = Date.UTC(2026, 0, 1);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" in UTC. Accepts a Date or an existing date key / ISO string. */
export function utcDateKey(date: Date | string): string {
  if (typeof date === "string") {
    if (DATE_KEY.test(date)) return date;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) throw new Error(`utcDateKey: invalid date "${date}"`);
    return parsed.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function dailySeed(date: Date | string): string {
  return `daily-${utcDateKey(date)}`;
}

/** 1-based day counter since 2026-01-01 UTC ("DAILY // 0266"). */
export function dailyNumber(date: Date | string): number {
  const [y, m, d] = utcDateKey(date).split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - DAILY_EPOCH) / DAY_MS) + 1;
}

/** 5-digit display number for an idea seed: "08421". */
export function ideaNumber(seed: string): string {
  return String(hashString(`n:${seed}`) % 100000).padStart(5, "0");
}
