/**
 * Copy templates for the synthesizer: product names, pitch frames and the
 * framing words that shift tone with the chaos level.
 *
 * Tone ladder (by chaos band):
 *   SANE 0–20          sober, useful, plain-spoken
 *   CREATIVE 20–40     warm side-project energy
 *   EXPERIMENTAL 40–60 playful, curious
 *   WEIRD 60–80        dry, slightly off
 *   CURSED 80–100      deadpan-unhinged: completely straight face, absurd premise
 *
 * Humor comes from framing and the gene combination, never from jokes or emoji.
 */
import type { MutationKind } from "@/types";
import type { Rng } from "@/lib/random";
import { fixArticles, sentence, tidy } from "./text";

/* ────────────────────────────────────────────────────────────────────────── */
/* Chaos bands                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

/** 0 SANE · 1 CREATIVE · 2 EXPERIMENTAL · 3 WEIRD · 4 CURSED */
export type BandIndex = 0 | 1 | 2 | 3 | 4;

export function bandIndex(chaos: number): BandIndex {
  if (chaos < 20) return 0;
  if (chaos < 40) return 1;
  if (chaos < 60) return 2;
  if (chaos < 80) return 3;
  return 4;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Names                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type NamePool = "domain" | "target" | "mechanic" | "chaos" | "trend" | "fusion";

export interface NameTemplate {
  id: string;
  /** Uses {A} and optionally {B}; literal words are UPPERCASE. */
  pattern: string;
  /** Inclusive chaos range where this template is in play. */
  min: number;
  max: number;
  weight: number;
  a: readonly NamePool[];
  b?: readonly NamePool[];
}

export const NAME_TEMPLATES: readonly NameTemplate[] = [
  // Sober: sounds like a tool you would pay for.
  { id: "subject-tool", pattern: "{A} {B}", min: 0, max: 60, weight: 3, a: ["domain"], b: ["mechanic"] },
  { id: "who-what", pattern: "{A} {B}", min: 0, max: 45, weight: 2, a: ["target"], b: ["domain"] },
  { id: "desk", pattern: "{A} DESK", min: 0, max: 30, weight: 1, a: ["domain"] },
  { id: "kit", pattern: "{A} KIT", min: 0, max: 30, weight: 0.8, a: ["domain", "mechanic"] },
  { id: "pilot", pattern: "{A} PILOT", min: 0, max: 25, weight: 0.8, a: ["domain"] },
  { id: "ledger", pattern: "{A} LEDGER", min: 0, max: 20, weight: 0.5, a: ["domain"] },
  // Creative.
  { id: "subject-rule", pattern: "{A} {B}", min: 20, max: 100, weight: 3, a: ["domain"], b: ["chaos"] },
  { id: "club", pattern: "{A} CLUB", min: 20, max: 70, weight: 1.4, a: ["domain", "target"] },
  { id: "season", pattern: "{A} SEASON", min: 20, max: 60, weight: 0.9, a: ["domain", "trend"] },
  { id: "trend-subject", pattern: "{A} {B}", min: 20, max: 80, weight: 1, a: ["trend"], b: ["domain"] },
  { id: "the-a-b", pattern: "THE {A} {B}", min: 30, max: 90, weight: 1, a: ["domain", "chaos"], b: ["mechanic", "chaos"] },
  { id: "rate-my", pattern: "RATE MY {A}", min: 30, max: 80, weight: 1, a: ["domain", "target"] },
  // Experimental → weird.
  { id: "slash", pattern: "{A}//{B}", min: 40, max: 100, weight: 1.4, a: ["domain"], b: ["chaos", "mechanic"] },
  { id: "anti", pattern: "ANTI-{A}", min: 40, max: 100, weight: 1, a: ["domain"] },
  { id: "no", pattern: "NO {A}", min: 40, max: 100, weight: 1, a: ["domain", "chaos"] },
  { id: "exe", pattern: "{A}.EXE", min: 50, max: 100, weight: 1.4, a: ["domain", "chaos"] },
  { id: "or", pattern: "{A} OR {B}", min: 50, max: 100, weight: 1, a: ["domain"], b: ["chaos"] },
  { id: "rule-tool", pattern: "{A} {B}", min: 60, max: 100, weight: 1, a: ["chaos"], b: ["mechanic"] },
  { id: "protocol", pattern: "{A} PROTOCOL", min: 60, max: 100, weight: 0.8, a: ["domain", "chaos"] },
  // Cursed.
  { id: "maxxing", pattern: "{A}MAXXING", min: 80, max: 100, weight: 1.5, a: ["domain", "target"] },
];

export interface NameWords {
  domain: readonly string[];
  target: readonly string[];
  mechanic: readonly string[];
  chaos: readonly string[];
  trend: readonly string[];
  /** FUSE: words from the B-side domain + mechanic. */
  fusion: readonly string[];
}

/** Keep only UPPERCASE single words that are safe to print in a name. */
export function sanitizeNameWords(words: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of words ?? []) {
    const w = raw.trim().toUpperCase();
    if (!w || /\s/.test(w) || w.length > 16) continue;
    if (!/^[A-Z0-9][A-Z0-9'&.-]*$/.test(w)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/** Name tokens (a "//" or "-" compound counts as one word). */
export function nameTokens(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

/** Two words are "the same" if one contains the other's stem (FOCUS / FOCUSED). */
function sameRoot(a: string, b: string): boolean {
  const x = a.replace(/[^A-Z0-9]/g, "");
  const y = b.replace(/[^A-Z0-9]/g, "");
  if (!x || !y) return false;
  if (x === y) return true;
  const stem = (s: string) => s.slice(0, Math.max(4, Math.min(s.length, 5)));
  return x.startsWith(stem(y)) || y.startsWith(stem(x));
}

/** Literal words inside a template pattern (e.g. "CLUB", "RATE", "MY"). */
function literalWords(pattern: string): string[] {
  return pattern
    .replace(/\{[AB]\}/g, " ")
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length > 1);
}

export function renderNameTemplate(pattern: string, a: string, b = ""): string {
  return pattern.replace("{A}", a).replace("{B}", b).replace(/\s+/g, " ").trim();
}

/** A rendered name passes: 1–3 tokens, no repeated word/root, no leftover slots. */
export function isValidName(name: string, a: string, b: string | undefined, pattern: string): boolean {
  if (/[{}]/.test(name)) return false;
  const tokens = nameTokens(name);
  if (tokens.length < 1 || tokens.length > 3) return false;
  if (b !== undefined && sameRoot(a, b)) return false;
  for (const lit of literalWords(pattern)) {
    if (sameRoot(lit, a) || (b !== undefined && sameRoot(lit, b))) return false;
  }
  return true;
}

export const NAME_SOFT_MAX = 22;

function poolWords(words: NameWords, pools: readonly NamePool[]): string[] {
  const out: string[] = [];
  for (const p of pools) for (const w of words[p]) if (!out.includes(w)) out.push(w);
  return out;
}

/**
 * Pick a name for the given chaos level. Tries a handful of template/word draws
 * and prefers the first that fits in NAME_SOFT_MAX characters; otherwise the
 * shortest valid one. Deterministic for a given rng.
 */
export function generateName(words: NameWords, chaos: number, rng: Rng, templates: readonly NameTemplate[] = NAME_TEMPLATES): string {
  const inBand = templates.filter((t) => chaos >= t.min && chaos <= t.max);
  const usable = inBand.filter(
    (t) => poolWords(words, t.a).length > 0 && (!t.b || poolWords(words, t.b).length > 0),
  );
  let fallback: string | null = null;
  for (let attempt = 0; attempt < 16 && usable.length > 0; attempt++) {
    const t = rng.weighted(usable, (x) => x.weight);
    const aPool = poolWords(words, t.a);
    const a = rng.pick(aPool);
    let b: string | undefined;
    if (t.b) {
      const bPool = poolWords(words, t.b).filter((w) => !sameRoot(w, a));
      if (bPool.length === 0) continue;
      b = rng.pick(bPool);
    }
    const name = renderNameTemplate(t.pattern, a, b);
    if (!isValidName(name, a, b, t.pattern)) continue;
    if (name.length <= NAME_SOFT_MAX) return name;
    if (fallback === null || name.length < fallback.length) fallback = name;
  }
  if (fallback) return fallback;
  return plainName(words);
}

/** Last-resort name from whatever words exist. */
function plainName(words: NameWords): string {
  const a = words.domain[0] ?? words.mechanic[0] ?? words.chaos[0] ?? words.target[0];
  const b = [...words.mechanic, ...words.chaos, ...words.target].find((w) => a !== undefined && !sameRoot(w, a));
  if (a && b) return `${a} ${b}`;
  return a ?? "NEW IDEA";
}

/** Longest suffix of `a` that is also a prefix of `b` (for portmanteaus). */
function overlap(a: string, b: string): number {
  const max = Math.min(a.length, b.length) - 2;
  for (let n = max; n >= 2; n--) if (a.endsWith(b.slice(0, n))) return n;
  return 0;
}

/**
 * FUSE names blend one word from each parent world: a true portmanteau when the
 * letters overlap (GHOST + STUDY → GHOSTUDY), otherwise a compound.
 */
export function generateFusionName(words: NameWords, rng: Rng): string {
  const aPool = poolWords(words, ["domain", "chaos", "target"]);
  const bPool = poolWords(words, ["fusion"]);
  if (aPool.length === 0 || bPool.length === 0) return generateName(words, 60, rng);
  const candidates: string[] = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    const a = rng.pick(aPool);
    const b = rng.pick(bPool.filter((w) => !sameRoot(w, a)).length > 0 ? bPool.filter((w) => !sameRoot(w, a)) : bPool);
    if (sameRoot(a, b)) continue;
    const n = overlap(a, b);
    if (n >= 2 && a.length + b.length - n <= 14) candidates.push(a + b.slice(n));
    candidates.push(`${a}//${b}`, `${a} ${b}`, `${a}-${b}`);
    if (candidates.length >= 4) break;
  }
  const fitting = candidates.filter((c) => c.length <= NAME_SOFT_MAX);
  if (fitting.length > 0) {
    // Portmanteaus are the most fun; favour them when present.
    return rng.weighted(fitting, (c) => (/[/\s-]/.test(c) ? 1 : 3));
  }
  if (candidates.length > 0) return candidates.reduce((x, y) => (y.length < x.length ? y : x));
  return generateName(words, 60, rng);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Pitch                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export const PITCH_MAX = 200;

export interface PitchParts {
  /** mechanic.adjective, "" when the product already contains it. */
  adjective: string;
  product: string;
  users: string;
  /** Filled chaos clause, starting with its connective. */
  clause: string;
}

export interface PitchFrame {
  id: string;
  min: number;
  max: number;
  weight: number;
  /** Frame only used when this mutation is the most recent one. */
  mutation?: MutationKind;
  /** False for frames that leave the target out (used when space is tight). */
  usesTarget: boolean;
  /** Frames that put a comma before the adjective need a non-empty adjective. */
  needsAdjective?: boolean;
  render(p: PitchParts): string;
}

const np = (p: PitchParts, lead = "") => tidy(`${lead} ${p.adjective} ${p.product}`);

export const PITCH_FRAMES: readonly PitchFrame[] = [
  // Every band: the house frame.
  { id: "core", min: 0, max: 100, weight: 3, usesTarget: true, render: (p) => `A ${np(p)} for ${p.users} ${p.clause}.` },

  // SANE — sober and useful.
  { id: "get", min: 0, max: 40, weight: 1.5, usesTarget: true, render: (p) => `${p.users} get a ${np(p)} ${p.clause}.` },
  { id: "built-for", min: 0, max: 20, weight: 1.2, usesTarget: true, render: (p) => `A ${np(p)} ${p.clause}, built for ${p.users}.` },
  { id: "no-nonsense", min: 0, max: 20, weight: 1, usesTarget: true, render: (p) => `A no-nonsense ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "focused", min: 0, max: 20, weight: 1, usesTarget: true, render: (p) => `A focused ${np(p)} for ${p.users} ${p.clause}.` },

  // CREATIVE — side-project warmth.
  { id: "small", min: 20, max: 40, weight: 1, usesTarget: true, needsAdjective: true, render: (p) => `A small, ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "made-for", min: 20, max: 40, weight: 1.2, usesTarget: true, render: (p) => `A ${np(p)} ${p.clause}, made for ${p.users}.` },
  { id: "lightweight", min: 20, max: 40, weight: 1, usesTarget: true, render: (p) => `A lightweight ${np(p)} for ${p.users} ${p.clause}.` },

  // EXPERIMENTAL — playful.
  { id: "experimental", min: 40, max: 60, weight: 1.2, usesTarget: true, render: (p) => `An experimental ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "basically", min: 40, max: 60, weight: 1, usesTarget: true, render: (p) => `Basically a ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "picture", min: 40, max: 60, weight: 1, usesTarget: true, render: (p) => `Picture a ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "stranger", min: 40, max: 60, weight: 0.9, usesTarget: true, render: (p) => `A ${np(p)} ${p.clause}, for ${p.users} who want something stranger.` },

  // WEIRD — dry, slightly off.
  { id: "deliberately", min: 60, max: 80, weight: 1.1, usesTarget: true, render: (p) => `A deliberately strange ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "aimed", min: 60, max: 80, weight: 1, usesTarget: true, render: (p) => `A ${np(p)} ${p.clause}, aimed squarely at ${p.users}.` },
  { id: "whether", min: 60, max: 80, weight: 1, usesTarget: true, render: (p) => `${p.users} get a ${np(p)} ${p.clause}, whether they asked for one or not.` },
  { id: "oddly", min: 60, max: 80, weight: 1, usesTarget: true, render: (p) => `An oddly specific ${np(p)} for ${p.users} ${p.clause}.` },

  // CURSED — deadpan, completely straight face.
  { id: "serious", min: 80, max: 100, weight: 1.2, usesTarget: true, render: (p) => `A completely serious ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "whole-product", min: 80, max: 100, weight: 1, usesTarget: true, render: (p) => `A ${np(p)} for ${p.users} ${p.clause}, and that is the whole product.` },
  { id: "straight-face", min: 80, max: 100, weight: 1, usesTarget: true, render: (p) => `A ${np(p)} ${p.clause}, pitched with a straight face to ${p.users}.` },
  { id: "nobody-joking", min: 80, max: 100, weight: 1, usesTarget: true, render: (p) => `A ${np(p)} for ${p.users} ${p.clause}, and nobody involved is joking.` },

  // Mutation-led framing (most recent mutation wins).
  { id: "practical", min: 0, max: 100, weight: 3, mutation: "useful", usesTarget: true, render: (p) => `A practical ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "genuinely-useful", min: 0, max: 100, weight: 2, mutation: "useful", usesTarget: true, render: (p) => `A genuinely useful ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "one-screen", min: 0, max: 100, weight: 3, mutation: "simpler", usesTarget: true, render: (p) => `A one-screen ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "tiny", min: 0, max: 100, weight: 2, mutation: "simpler", usesTarget: true, render: (p) => `A tiny ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "zero-budget", min: 0, max: 100, weight: 3, mutation: "cheaper", usesTarget: true, render: (p) => `A zero-budget ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "free-to-run", min: 0, max: 100, weight: 2, mutation: "cheaper", usesTarget: true, render: (p) => `A free-to-run ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "ambitious-tech", min: 0, max: 100, weight: 3, mutation: "technical", usesTarget: true, render: (p) => `A technically ambitious ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "engineering", min: 0, max: 100, weight: 2, mutation: "technical", usesTarget: true, render: (p) => `An engineering-heavy ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "ambitious", min: 0, max: 100, weight: 3, mutation: "harder", usesTarget: true, render: (p) => `An ambitious ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "screenshotted", min: 0, max: 100, weight: 3, mutation: "viral", usesTarget: true, render: (p) => `A ${np(p)} for ${p.users} ${p.clause}, built to be screenshotted.` },
  { id: "shareable", min: 0, max: 100, weight: 2, mutation: "viral", usesTarget: true, render: (p) => `A shareable ${np(p)} for ${p.users} ${p.clause}.` },
  { id: "groups-of", min: 0, max: 100, weight: 3, mutation: "social", usesTarget: true, render: (p) => `A ${np(p)} for groups of ${p.users} ${p.clause}.` },
  { id: "with-friends", min: 0, max: 100, weight: 2, mutation: "social", usesTarget: true, render: (p) => `A ${np(p)} for ${p.users} ${p.clause}, better with the whole group.` },
];

/** Target-free frames for when a clause is too long to fit the house frame. */
const SHORT_FRAMES: readonly ((p: PitchParts) => string)[] = [
  (p) => `A ${np(p)} ${p.clause}.`,
  (p) => `A ${np(p)} for ${p.users}.`,
];

function finishPitch(raw: string): string {
  return sentence(fixArticles(tidy(raw)), { terminal: "." });
}

/**
 * Build the one-sentence pitch. Chooses a frame for the chaos band (or the
 * latest mutation), guarantees a single terminal period and fixed articles, and
 * falls back to shorter frames when the result would exceed PITCH_MAX.
 */
export function buildPitch(parts: PitchParts, chaos: number, mutations: readonly MutationKind[], rng: Rng): string {
  const last = mutations[mutations.length - 1];
  const mutationFrames = last ? PITCH_FRAMES.filter((f) => f.mutation === last) : [];
  const bandFrames = PITCH_FRAMES.filter((f) => !f.mutation && chaos >= f.min && chaos <= f.max);
  const pool = (mutationFrames.length > 0 && rng.chance(0.75) ? mutationFrames : bandFrames).filter(
    (f) => !(f.needsAdjective && !parts.adjective),
  );
  const first = pool.length > 0 ? rng.weighted(pool, (f) => f.weight) : undefined;
  const rest = pool.filter((f) => f !== first).sort((x, y) => y.weight - x.weight);
  const tries = first ? [first, ...rest] : rest;
  for (const frame of tries) {
    const text = finishPitch(frame.render(parts));
    if (text.length <= PITCH_MAX) return text;
  }
  // Clause too long for any framed variant: drop the target, then the clause.
  const candidates = SHORT_FRAMES.map((f) => finishPitch(f(parts)));
  return candidates.find((c) => c.length <= PITCH_MAX) ?? candidates[0];
}

export interface FusionPitchParts {
  adjectiveA: string;
  productA: string;
  adjectiveB: string;
  productB: string;
  users: string;
  clause: string;
}

type FusionFrame = (p: FusionPitchParts) => string;

const nA = (p: FusionPitchParts) => tidy(`${p.adjectiveA} ${p.productA}`);
const nB = (p: FusionPitchParts) => tidy(`${p.adjectiveB} ${p.productB}`);

const FUSION_FRAMES: readonly FusionFrame[] = [
  (p) => `A ${nA(p)} that plays like a ${nB(p)}, for ${p.users} ${p.clause}.`,
  (p) => `${p.productA} meets ${p.productB}: a ${tidy(`${p.adjectiveA}${p.adjectiveA && p.adjectiveB ? "," : ""} ${p.adjectiveB}`)} hybrid for ${p.users} ${p.clause}.`,
  (p) => `Half ${p.productA}, half ${nB(p)}: a ${tidy(`${p.adjectiveA} hybrid`)} for ${p.users} ${p.clause}.`,
  (p) => `A ${nA(p)} crossed with a ${nB(p)}, for ${p.users} ${p.clause}.`,
];

const FUSION_SHORT: readonly FusionFrame[] = [
  (p) => `A ${nA(p)} that plays like a ${nB(p)} ${p.clause}.`,
  (p) => `${p.productA} meets ${p.productB}: a hybrid ${p.clause}.`,
  (p) => `A ${nA(p)} that plays like a ${nB(p)}, for ${p.users}.`,
  (p) => `${p.productA} meets ${p.productB}, for ${p.users}.`,
];

/** Pitch for FUSE results: names both products and keeps both mechanics recognizable. */
export function buildFusionPitch(parts: FusionPitchParts, rng: Rng): string {
  const sameProduct = parts.productA.toLowerCase() === parts.productB.toLowerCase();
  if (sameProduct) {
    const merged: PitchParts = {
      adjective: tidy(
        parts.adjectiveA && parts.adjectiveB && parts.adjectiveA !== parts.adjectiveB
          ? `${parts.adjectiveA}, ${parts.adjectiveB}`
          : parts.adjectiveA || parts.adjectiveB,
      ),
      product: `${parts.productA} remix`,
      users: parts.users,
      clause: parts.clause,
    };
    return finishPitch(`A ${np(merged)} for ${merged.users} ${merged.clause}.`);
  }
  const order = rng.shuffle(FUSION_FRAMES);
  for (const frame of [...order, ...FUSION_SHORT]) {
    const text = finishPitch(frame(parts));
    if (text.length <= PITCH_MAX) return text;
  }
  return finishPitch(FUSION_SHORT[FUSION_SHORT.length - 1](parts));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* "Why" + hook framing                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/** Lead-ins for the twist sentence in WHY (text after the colon continues lowercase). */
export const TWIST_LEADS: Readonly<Record<BandIndex, readonly string[]>> = {
  0: ["", "Why it works: ", "The practical edge: "],
  1: ["The twist: ", "What makes it stick: ", ""],
  2: ["The experiment: ", "Here is the bet: ", "The twist: "],
  3: ["It sounds wrong, which is why it works: ", "The strange part is the point: ", "Odd, but deliberate: "],
  4: ["This should not work, and yet: ", "Deadpan truth: ", "Nobody asked for this, which is the point: "],
};

/** Lead-ins overriding the band when a mutation reframes the idea. */
export const MUTATION_TWIST_LEADS: Partial<Record<MutationKind, readonly string[]>> = {
  useful: ["The useful part: ", "In practice: "],
  viral: ["Why people will share it: ", "The screenshot moment: "],
  social: ["Why it needs friends: ", "The social hook: "],
  simpler: ["Kept small on purpose: "],
  cheaper: ["Cheap to run, and still: "],
  technical: ["The hard, interesting part: "],
  harder: ["The ambitious part: "],
};

/** Subject + adverb that introduces the trend sentence ("It also, somehow, …"). */
export const TREND_LEADS: Readonly<Record<BandIndex, readonly string[]>> = {
  0: ["It", "On timing, it"],
  1: ["It also", "Timing helps: it"],
  2: ["Bonus: it", "It also"],
  3: ["And yes, it", "It also"],
  4: ["It also, somehow,", "And, for reasons, it"],
};

/** How problem sentences are introduced at higher chaos (empty = as-is). */
export const PROBLEM_LEADS: Readonly<Record<BandIndex, readonly string[]>> = {
  0: [""],
  1: [""],
  2: ["", "The real problem: "],
  3: ["", "The real problem: "],
  4: ["", "Documented fact: "],
};
