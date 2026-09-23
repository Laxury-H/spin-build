/**
 * Gene pool: the catalog the roller draws from and recipes resolve against,
 * plus the conflict model shared by rolling, mutation repair and fusion.
 *
 * Everything here is pure. The default pool is built lazily from `@/data`;
 * tests (and any future "custom deck" feature) inject their own via
 * `createGenePool`.
 */
import type {
  ChaosModifier,
  Constraint,
  DnaKey,
  Domain,
  IdeaDNA,
  IdeaRecipe,
  Mechanic,
  Region,
  Sector,
  SectorId,
  Target,
  Trend,
  TrendRef,
} from "@/types";
import {
  CHAOS_MODIFIERS,
  CONSTRAINTS,
  DOMAINS,
  FALLBACK_TRENDS,
  MECHANICS,
  SECTORS,
  TARGETS,
} from "@/data";
import { hashString } from "@/lib/random";

/* ────────────────────────────────────────────────────────────────────────── */
/* Pool                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export interface GenePoolSource {
  domains: readonly Domain[];
  targets: readonly Target[];
  mechanics: readonly Mechanic[];
  chaos: readonly ChaosModifier[];
  constraints: readonly Constraint[];
  /** Curated trends — the only trends a recipe may reference by id. */
  trends: readonly Trend[];
  /** Wheel sectors; defaults to the 18 fixed `SECTORS`. */
  sectors?: readonly Sector[];
}

export interface GenePool {
  readonly sectors: readonly Sector[];
  readonly domains: readonly Domain[];
  readonly targets: readonly Target[];
  readonly mechanics: readonly Mechanic[];
  readonly chaos: readonly ChaosModifier[];
  readonly constraints: readonly Constraint[];
  readonly trends: readonly Trend[];
  /** Domains grouped by wheel sector (sectors without domains are absent). */
  readonly domainsBySector: ReadonlyMap<SectorId, readonly Domain[]>;
  getDomain(id: string): Domain | undefined;
  getTarget(id: string): Target | undefined;
  getMechanic(id: string): Mechanic | undefined;
  getChaos(id: string): ChaosModifier | undefined;
  getConstraint(id: string): Constraint | undefined;
  getTrend(id: string): Trend | undefined;
  /**
   * Curated trends eligible for a region: GLOBAL → GLOBAL only;
   * VN → VN + GLOBAL (the roller down-weights the foreign ones).
   */
  trendsFor(region: Region): readonly Trend[];
}

function indexById<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) if (!map.has(item.id)) map.set(item.id, item);
  return map;
}

export function createGenePool(src: GenePoolSource): GenePool {
  const domainMap = indexById(src.domains);
  const targetMap = indexById(src.targets);
  const mechanicMap = indexById(src.mechanics);
  const chaosMap = indexById(src.chaos);
  const constraintMap = indexById(src.constraints);
  const trendMap = indexById(src.trends);

  const bySector = new Map<SectorId, Domain[]>();
  for (const d of domainMap.values()) {
    const list = bySector.get(d.sector);
    if (list) list.push(d);
    else bySector.set(d.sector, [d]);
  }

  const globalTrends = src.trends.filter((t) => t.region === "GLOBAL");
  const vnTrends = src.trends.filter((t) => t.region === "VN" || t.region === "GLOBAL");

  return {
    sectors: src.sectors ?? SECTORS,
    domains: [...domainMap.values()],
    targets: [...targetMap.values()],
    mechanics: [...mechanicMap.values()],
    chaos: [...chaosMap.values()],
    constraints: [...constraintMap.values()],
    trends: [...trendMap.values()],
    domainsBySector: bySector,
    getDomain: (id) => domainMap.get(id),
    getTarget: (id) => targetMap.get(id),
    getMechanic: (id) => mechanicMap.get(id),
    getChaos: (id) => chaosMap.get(id),
    getConstraint: (id) => constraintMap.get(id),
    getTrend: (id) => trendMap.get(id),
    trendsFor: (region) => (region === "VN" ? vnTrends : globalTrends),
  };
}

let defaultPool: GenePool | null = null;

/** The pool built from the shipped datasets (`@/data`). Memoized. */
export function defaultGenePool(): GenePool {
  if (!defaultPool) {
    defaultPool = createGenePool({
      domains: DOMAINS,
      targets: TARGETS,
      mechanics: MECHANICS,
      chaos: CHAOS_MODIFIERS,
      constraints: CONSTRAINTS,
      trends: FALLBACK_TRENDS,
      sectors: SECTORS,
    });
  }
  return defaultPool;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Conflict model                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

/** Anything that can sit in a gene slot (dataset entries and trends). */
export interface GeneLike {
  readonly id: string;
  readonly tags: readonly string[];
  readonly conflicts?: readonly string[];
}

export interface GeneProfile {
  /** The gene's id plus its tags — what other genes' `conflicts` match against. */
  readonly marks: ReadonlySet<string>;
  readonly conflicts: ReadonlySet<string>;
  readonly minors: boolean;
  readonly adultOnly: boolean;
}

export const TAG_MINORS = "minors";
export const TAG_ADULT_ONLY = "adult-only";

/** Clash weight of an ordinary declared conflict. */
export const CONFLICT_CLASH = 1;
/**
 * Clash weight of `minors` × `adult-only`. Enforced even when no dataset entry
 * declares it, and weighted so heavily that the "least-conflicting" fallback
 * will accept any number of ordinary conflicts before this one.
 */
export const SAFETY_CLASH = 1000;

const profiles = new WeakMap<GeneLike, GeneProfile>();

export function geneProfile(gene: GeneLike): GeneProfile {
  const cached = profiles.get(gene);
  if (cached) return cached;
  const marks = new Set<string>(gene.tags);
  marks.add(gene.id);
  const profile: GeneProfile = {
    marks,
    conflicts: new Set(gene.conflicts ?? []),
    minors: marks.has(TAG_MINORS),
    adultOnly: marks.has(TAG_ADULT_ONLY),
  };
  profiles.set(gene, profile);
  return profile;
}

function overlaps(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const v of small) if (large.has(v)) return true;
  return false;
}

/** 0 when compatible; otherwise CONFLICT_CLASH and/or SAFETY_CLASH. Symmetric. */
export function clash(a: GeneProfile, b: GeneProfile): number {
  let score = 0;
  if (overlaps(a.conflicts, b.marks) || overlaps(b.conflicts, a.marks)) score += CONFLICT_CLASH;
  if ((a.minors && b.adultOnly) || (a.adultOnly && b.minors)) score += SAFETY_CLASH;
  return score;
}

/** Total clash of one gene against a set of already-chosen genes. */
export function clashWith(profile: GeneProfile, others: readonly GeneProfile[]): number {
  let score = 0;
  for (const o of others) if (o !== profile) score += clash(profile, o);
  return score;
}

export function genesConflict(a: GeneLike, b: GeneLike): boolean {
  return clash(geneProfile(a), geneProfile(b)) > 0;
}

export interface ConflictPair {
  a: DnaKey | "extra";
  b: DnaKey | "extra";
  aId: string;
  bId: string;
  safety: boolean;
}

/** Every conflicting pair in a DNA (plus optional extra genes such as FUSE B-side genes). */
export function dnaConflicts(dna: IdeaDNA, extras: readonly GeneLike[] = []): ConflictPair[] {
  const slots: { key: DnaKey | "extra"; gene: GeneLike }[] = [
    { key: "domain", gene: dna.domain },
    { key: "target", gene: dna.target },
    { key: "mechanic", gene: dna.mechanic },
    { key: "trend", gene: dna.trend },
    { key: "chaos", gene: dna.chaos },
    { key: "constraint", gene: dna.constraint },
    ...extras.map((gene) => ({ key: "extra" as const, gene })),
  ];
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.key === "extra" && b.key === "extra") continue;
      const score = clash(geneProfile(a.gene), geneProfile(b.gene));
      if (score > 0) {
        pairs.push({ a: a.key, b: b.key, aId: a.gene.id, bId: b.gene.id, safety: score >= SAFETY_CLASH });
      }
    }
  }
  return pairs;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Trend references                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

/** Score given to live trends rebuilt from a share code (their live score is not encoded). */
export const INLINE_TREND_SCORE = 60;
export const INLINE_TREND_MAX_TITLE = 120;
export const INLINE_TREND_MAX_TAGS = 12;

const slugCache = new Map<string, string>();

/**
 * Stable ASCII slug for a trend title. Handles Vietnamese (diacritics + đ) and
 * falls back to a hash for titles with no Latin letters at all.
 */
export function trendSlug(title: string): string {
  const cached = slugCache.get(title);
  if (cached !== undefined) return cached;
  const ascii = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  const slug = ascii || `t${hashString(title).toString(36)}`;
  if (slugCache.size > 2000) slugCache.clear();
  slugCache.set(title, slug);
  return slug;
}

/** Id a trend has once it has been through a recipe (the id `comboKey` sees). */
export function canonicalTrendId(trend: Trend, pool: GenePool): string {
  if (pool.getTrend(trend.id)) return trend.id;
  return `${trend.source}:${trendSlug(trend.title)}`;
}

/** Curated trends travel by id; anything else is snapshotted inline. */
export function trendRefOf(trend: Trend, pool: GenePool): TrendRef {
  if (pool.getTrend(trend.id)) return { id: trend.id };
  const tags: string[] = [];
  for (const tag of trend.tags) {
    const t = tag.trim();
    if (t && t.length <= 48 && !tags.includes(t)) tags.push(t);
    if (tags.length >= INLINE_TREND_MAX_TAGS) break;
  }
  const title = trend.title.trim().slice(0, INLINE_TREND_MAX_TITLE) || trend.id.slice(0, INLINE_TREND_MAX_TITLE);
  return { title, category: trend.category, source: trend.source, tags };
}

export function trendRefId(ref: TrendRef): string {
  return "id" in ref ? ref.id : `${ref.source}:${trendSlug(ref.title)}`;
}

/** Resolve a trend reference. Inline refs become a fresh Trend observed at `now`. */
export function materializeTrend(
  ref: TrendRef,
  region: Region,
  now: number,
  pool: GenePool,
): Trend | undefined {
  if ("id" in ref) return pool.getTrend(ref.id);
  return {
    id: trendRefId(ref),
    title: ref.title,
    source: ref.source,
    category: ref.category,
    score: INLINE_TREND_SCORE,
    timestamp: now,
    region,
    tags: [...ref.tags],
    sources: [ref.source],
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* DNA ⇄ recipe                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

/** "domain|target|mechanic|trend|chaos|constraint" — the identity of a gene combination. */
export function comboKey(dna: IdeaDNA): string {
  return [dna.domain.id, dna.target.id, dna.mechanic.id, dna.trend.id, dna.chaos.id, dna.constraint.id].join("|");
}

/** Same key as `comboKey(ideaFromRecipe(recipe).dna)`, without building the idea. */
export function recipeComboKey(recipe: IdeaRecipe): string {
  const d = recipe.dna;
  return [d.domain, d.target, d.mechanic, trendRefId(d.trend), d.chaos, d.constraint].join("|");
}

export function dnaToRecipeDna(dna: IdeaDNA, pool: GenePool): IdeaRecipe["dna"] {
  return {
    domain: dna.domain.id,
    target: dna.target.id,
    mechanic: dna.mechanic.id,
    trend: trendRefOf(dna.trend, pool),
    chaos: dna.chaos.id,
    constraint: dna.constraint.id,
  };
}

/** Resolve every gene of a recipe; `null` if any id is unknown to the pool. */
export function resolveDna(recipe: IdeaRecipe, now: number, pool: GenePool): IdeaDNA | null {
  const d = recipe.dna;
  const domain = pool.getDomain(d.domain);
  const target = pool.getTarget(d.target);
  const mechanic = pool.getMechanic(d.mechanic);
  const trend = materializeTrend(d.trend, recipe.region, now, pool);
  const chaos = pool.getChaos(d.chaos);
  const constraint = pool.getConstraint(d.constraint);
  if (!domain || !target || !mechanic || !trend || !chaos || !constraint) return null;
  return { domain, target, mechanic, trend, chaos, constraint };
}

/** Swap locked genes for the pool's current copy; drop locks the pool no longer knows. */
export function freshenLocks(locked: Partial<IdeaDNA> | undefined, pool: GenePool): Partial<IdeaDNA> {
  const out: Partial<IdeaDNA> = {};
  if (!locked) return out;
  if (locked.domain) {
    const v = pool.getDomain(locked.domain.id);
    if (v) out.domain = v;
  }
  if (locked.target) {
    const v = pool.getTarget(locked.target.id);
    if (v) out.target = v;
  }
  if (locked.mechanic) {
    const v = pool.getMechanic(locked.mechanic.id);
    if (v) out.mechanic = v;
  }
  if (locked.chaos) {
    const v = pool.getChaos(locked.chaos.id);
    if (v) out.chaos = v;
  }
  if (locked.constraint) {
    const v = pool.getConstraint(locked.constraint.id);
    if (v) out.constraint = v;
  }
  // Trends are valid whether curated or live: live trends travel inline.
  if (locked.trend) out.trend = pool.getTrend(locked.trend.id) ?? locked.trend;
  return out;
}
