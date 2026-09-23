/**
 * Gene roller: picks the six genes of an idea with the seeded RNG.
 *
 *   weight = entry.weight × chaosAffinity(weirdness, chaos) × recency × bias
 *
 * - Domains: a sector is picked uniformly among the non-excluded sectors that
 *   still have a compatible domain, then a domain inside it by weight — so every
 *   wheel sector is equally likely no matter how many domains it holds.
 * - Trends: (score/100)^0.8 × chaosAffinity(category weirdness) × region factor
 *   × recency. An injected trend always wins.
 * - Conflicts are symmetric across all genes (ids or tags in `conflicts`), and
 *   `minors` × `adult-only` is always a conflict. Locked genes stay fixed; if a
 *   slot has no compatible candidate the least-conflicting one is used instead
 *   of failing.
 *
 * Pools are parameters (default: the shipped datasets) so this is testable with
 * fixtures.
 */
import type {
  ChaosModifier,
  DatasetEntry,
  DnaKey,
  Domain,
  IdeaDNA,
  Region,
  SectorId,
  Trend,
  TrendCategory,
} from "@/types";
import { DNA_KEYS } from "@/types";
import { chaosAffinity, type Rng } from "@/lib/random";
import {
  canonicalTrendId,
  clash,
  clashWith,
  defaultGenePool,
  geneProfile,
  type GeneLike,
  type GenePool,
  type GeneProfile,
} from "./pool";

/* ────────────────────────────────────────────────────────────────────────── */
/* Tunables                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/** Weight multiplier for genes that appear in any recent comboKey. */
export const RECENCY_PENALTY = 0.35;
/** Chaos modifiers whose tags match the spark bias get this boost… */
export const CHAOS_BIAS_BOOST = 1.6;
/** …but only once chaos is at least this high. */
export const CHAOS_BIAS_MIN_CHAOS = 40;
/** Trends from outside the spin's region (e.g. GLOBAL trends on a VN spin). */
export const FOREIGN_TREND_FACTOR = 0.6;
/** Exponent flattening trend scores so hot trends lead without monopolizing. */
export const TREND_SCORE_EXPONENT = 0.8;
/** Whole-roll retries when a rolled (unlocked) gene is left in conflict. */
const RESOLVE_ATTEMPTS = 4;

/** How weird a trend category feels, on the same 0–100 scale as dataset weirdness. */
export const CATEGORY_WEIRDNESS: Readonly<Record<TrendCategory, number>> = {
  MEME: 85,
  CULTURE: 65,
  VIDEO: 60,
  GAMING: 55,
  MUSIC: 55,
  LIFESTYLE: 45,
  AI: 45,
  SPORTS: 45,
  DESIGN: 40,
  SCIENCE: 35,
  TECH: 30,
  FINANCE: 30,
  NEWS: 25,
  OTHER: 50,
};

export function categoryWeirdness(category: TrendCategory): number {
  return CATEGORY_WEIRDNESS[category] ?? CATEGORY_WEIRDNESS.OTHER;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Options                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export interface RollOptions {
  /** 0–100 (clamped). */
  chaos: number;
  region: Region;
  /** Genes kept verbatim. */
  locked?: Partial<IdeaDNA>;
  /** Forces the trend gene; beats a locked trend. */
  injectedTrend?: Trend | null;
  /** Candidate trends; empty/absent → curated trends for the region. */
  trendPool?: readonly Trend[];
  /** Recent comboKeys: their genes are down-weighted (not banned). */
  recent?: readonly string[];
  excludeSectors?: readonly SectorId[];
  /** Tags that bias chaos-modifier choice (from /api/spark). */
  chaosBias?: readonly string[];
  /** Extra genes (e.g. FUSE B-side domain/mechanic) every rolled gene must be compatible with. */
  anchors?: readonly GeneLike[];
}

type RecentSets = Readonly<Record<DnaKey, ReadonlySet<string>>>;

interface RollContext {
  pool: GenePool;
  chaos: number;
  region: Region;
  fixed: Partial<IdeaDNA>;
  recent: RecentSets;
  excluded: ReadonlySet<SectorId>;
  bias: ReadonlySet<string>;
  trends: readonly Trend[];
  anchors: readonly GeneProfile[];
}

export function clampChaos(chaos: number): number {
  if (!Number.isFinite(chaos)) return 50;
  return Math.min(100, Math.max(0, Math.round(chaos)));
}

/** Split recent comboKeys into per-gene id sets. Malformed keys are ignored. */
export function recentGeneSets(recent: readonly string[] = []): RecentSets {
  const sets: Record<DnaKey, Set<string>> = {
    domain: new Set(),
    target: new Set(),
    mechanic: new Set(),
    trend: new Set(),
    chaos: new Set(),
    constraint: new Set(),
  };
  for (const key of recent) {
    const parts = key.split("|");
    if (parts.length !== DNA_KEYS.length) continue;
    DNA_KEYS.forEach((k, i) => {
      if (parts[i]) sets[k].add(parts[i]);
    });
  }
  return sets;
}

/** Trend candidates for a roll: the given pool, or curated trends for the region. */
export function trendCandidates(
  region: Region,
  trendPool: readonly Trend[] | undefined,
  pool: GenePool = defaultGenePool(),
): readonly Trend[] {
  if (trendPool && trendPool.length > 0) return trendPool;
  return pool.trendsFor(region);
}

function buildContext(opts: RollOptions, pool: GenePool): RollContext {
  const fixed: Partial<IdeaDNA> = { ...(opts.locked ?? {}) };
  if (opts.injectedTrend) fixed.trend = opts.injectedTrend;
  return {
    pool,
    chaos: clampChaos(opts.chaos),
    region: opts.region,
    fixed,
    recent: recentGeneSets(opts.recent),
    excluded: new Set(opts.excludeSectors ?? []),
    bias: new Set(opts.chaosBias ?? []),
    trends: trendCandidates(opts.region, opts.trendPool, pool),
    anchors: (opts.anchors ?? []).map(geneProfile),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Weights                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function baseWeight(entry: DatasetEntry): number {
  const w = entry.weight;
  return w !== undefined && Number.isFinite(w) && w > 0 ? w : 1;
}

/** Selection weight of a dataset entry in a gene slot. Exposed for tests/tuning. */
export function entryWeight(
  entry: DatasetEntry,
  key: DnaKey,
  chaos: number,
  recent: RecentSets,
): number {
  let w = baseWeight(entry) * chaosAffinity(entry.weirdness, chaos);
  if (recent[key].has(entry.id)) w *= RECENCY_PENALTY;
  return w;
}

function chaosModifierWeight(entry: ChaosModifier, ctx: RollContext): number {
  let w = entryWeight(entry, "chaos", ctx.chaos, ctx.recent);
  if (ctx.chaos >= CHAOS_BIAS_MIN_CHAOS && ctx.bias.size > 0 && entry.tags.some((t) => ctx.bias.has(t))) {
    w *= CHAOS_BIAS_BOOST;
  }
  return w;
}

/** Selection weight of a trend. Exposed for tests/tuning. */
export function trendWeight(
  trend: Trend,
  chaos: number,
  region: Region,
  recent: RecentSets,
  pool: GenePool = defaultGenePool(),
): number {
  const score = Number.isFinite(trend.score) ? Math.min(100, Math.max(1, trend.score)) : 50;
  let w = (score / 100) ** TREND_SCORE_EXPONENT * chaosAffinity(categoryWeirdness(trend.category), chaos);
  if (trend.region !== region) w *= FOREIGN_TREND_FACTOR;
  if (recent.trend.has(canonicalTrendId(trend, pool))) w *= RECENCY_PENALTY;
  return w;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Picking                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Weighted pick among candidates compatible with `others`; when none is
 * compatible, weighted pick among the least-conflicting ones.
 */
function pickCompatible<T extends GeneLike>(
  rng: Rng,
  items: readonly T[],
  others: readonly GeneProfile[],
  weight: (item: T) => number,
): T {
  if (items.length === 0) throw new Error("generator: cannot pick from an empty gene pool");
  const free: T[] = [];
  let least: T[] = [];
  let leastScore = Infinity;
  for (const item of items) {
    const score = clashWith(geneProfile(item), others);
    if (score === 0) {
      free.push(item);
    } else if (free.length === 0) {
      if (score < leastScore) {
        leastScore = score;
        least = [item];
      } else if (score === leastScore) {
        least.push(item);
      }
    }
  }
  return rng.weighted(free.length > 0 ? free : least, weight);
}

function pickDomain(rng: Rng, ctx: RollContext, others: readonly GeneProfile[]): Domain {
  const { pool } = ctx;
  const allowed = pool.sectors.filter((s) => !ctx.excluded.has(s.id));
  const sectors = allowed.length > 0 ? allowed : pool.sectors;
  const weight = (d: Domain) => entryWeight(d, "domain", ctx.chaos, ctx.recent);

  const open: Domain[][] = [];
  for (const sector of sectors) {
    const domains = pool.domainsBySector.get(sector.id);
    if (!domains) continue;
    const free = domains.filter((d) => clashWith(geneProfile(d), others) === 0);
    if (free.length > 0) open.push(free);
  }
  if (open.length > 0) return rng.weighted(rng.pick(open), weight);

  // Every allowed domain clashes with a fixed gene: take the least-conflicting one,
  // still honoring sector exclusion whenever the allowed sectors have any domains.
  const inAllowed = sectors.flatMap((s) => pool.domainsBySector.get(s.id) ?? []);
  return pickCompatible(rng, inAllowed.length > 0 ? inAllowed : pool.domains, others, weight);
}

function rollOnce(rng: Rng, ctx: RollContext): { dna: IdeaDNA; rolled: ReadonlySet<DnaKey> } {
  const { fixed, pool } = ctx;
  const rolled = new Set<DnaKey>();
  const others: GeneProfile[] = [...ctx.anchors];
  for (const key of DNA_KEYS) {
    const gene = fixed[key];
    if (gene) others.push(geneProfile(gene));
  }
  const take = <T extends GeneLike>(key: DnaKey, chosen: T | undefined, roll: () => T): T => {
    if (chosen) return chosen;
    const gene = roll();
    rolled.add(key);
    others.push(geneProfile(gene));
    return gene;
  };

  const domain = take("domain", fixed.domain, () => pickDomain(rng, ctx, others));
  const target = take("target", fixed.target, () =>
    pickCompatible(rng, pool.targets, others, (t) => entryWeight(t, "target", ctx.chaos, ctx.recent)),
  );
  const mechanic = take("mechanic", fixed.mechanic, () =>
    pickCompatible(rng, pool.mechanics, others, (m) => entryWeight(m, "mechanic", ctx.chaos, ctx.recent)),
  );
  const trend = take("trend", fixed.trend, () =>
    pickCompatible(rng, ctx.trends, others, (t) => trendWeight(t, ctx.chaos, ctx.region, ctx.recent, pool)),
  );
  const chaos = take("chaos", fixed.chaos, () =>
    pickCompatible(rng, pool.chaos, others, (c) => chaosModifierWeight(c, ctx)),
  );
  const constraint = take("constraint", fixed.constraint, () =>
    pickCompatible(rng, pool.constraints, others, (c) =>
      entryWeight(c, "constraint", ctx.chaos, ctx.recent),
    ),
  );
  return { dna: { domain, target, mechanic, trend, chaos, constraint }, rolled };
}

/** Clash that involves at least one rolled gene (clashes among fixed genes are the caller's choice). */
function rolledClash(dna: IdeaDNA, rolled: ReadonlySet<DnaKey>, anchors: readonly GeneProfile[]): number {
  let score = 0;
  for (let i = 0; i < DNA_KEYS.length; i++) {
    const ki = DNA_KEYS[i];
    const pi = geneProfile(dna[ki]);
    if (rolled.has(ki)) score += clashWith(pi, anchors);
    for (let j = i + 1; j < DNA_KEYS.length; j++) {
      const kj = DNA_KEYS[j];
      if (!rolled.has(ki) && !rolled.has(kj)) continue;
      score += clash(pi, geneProfile(dna[kj]));
    }
  }
  return score;
}

/**
 * Roll a full DNA. Locked genes (and an injected trend) are kept verbatim; every
 * other gene is drawn by weight among candidates compatible with everything
 * chosen so far. Deterministic for a given rng seed + options + pool.
 */
export function rollDna(rng: Rng, opts: RollOptions, pool: GenePool = defaultGenePool()): IdeaDNA {
  const ctx = buildContext(opts, pool);
  let best = rollOnce(rng, ctx);
  let bestScore = rolledClash(best.dna, best.rolled, ctx.anchors);
  // Greedy order can paint itself into a corner (an early pick leaves a later slot
  // with no compatible option): retry on independent sub-streams, keep the cleanest.
  for (let attempt = 1; bestScore > 0 && attempt < RESOLVE_ATTEMPTS; attempt++) {
    const next = rollOnce(rng.fork(`resolve-${attempt}`), ctx);
    const score = rolledClash(next.dna, next.rolled, ctx.anchors);
    if (score < bestScore) {
      best = next;
      bestScore = score;
    }
  }
  return best.dna;
}

function keepGene<K extends DnaKey>(out: Partial<IdeaDNA>, dna: IdeaDNA, key: K): void {
  out[key] = dna[key];
}

/** Keys of genes involved in a clash that the caller allows to change. */
export function clashingGenes(
  dna: IdeaDNA,
  keep: ReadonlySet<DnaKey>,
  anchors: readonly GeneLike[] = [],
): Set<DnaKey> {
  const loose = new Set<DnaKey>();
  const anchorProfiles = anchors.map(geneProfile);
  for (let i = 0; i < DNA_KEYS.length; i++) {
    const ki = DNA_KEYS[i];
    const pi = geneProfile(dna[ki]);
    if (!keep.has(ki) && clashWith(pi, anchorProfiles) > 0) loose.add(ki);
    for (let j = i + 1; j < DNA_KEYS.length; j++) {
      const kj = DNA_KEYS[j];
      if (clash(pi, geneProfile(dna[kj])) === 0) continue;
      if (!keep.has(ki)) loose.add(ki);
      if (!keep.has(kj)) loose.add(kj);
    }
  }
  return loose;
}

/**
 * Re-roll only the genes that clash (and are not in `keep`), keeping everything
 * else fixed. Returns the input object unchanged when there is nothing to fix.
 */
export function repairDna(
  rng: Rng,
  dna: IdeaDNA,
  keep: ReadonlySet<DnaKey>,
  opts: Omit<RollOptions, "locked" | "injectedTrend">,
  pool: GenePool = defaultGenePool(),
): IdeaDNA {
  const loose = clashingGenes(dna, keep, opts.anchors);
  if (loose.size === 0) return dna;
  const locked: Partial<IdeaDNA> = {};
  for (const key of DNA_KEYS) if (!loose.has(key)) keepGene(locked, dna, key);
  return rollDna(rng, { ...opts, locked }, pool);
}

/** Pick one gene compatible with `against`, e.g. a replacement FUSE B-side domain. */
export function pickCompatibleGene<T extends GeneLike>(
  rng: Rng,
  candidates: readonly T[],
  against: readonly GeneLike[],
  weight: (item: T) => number,
): T {
  return pickCompatible(rng, candidates, against.map(geneProfile), weight);
}
