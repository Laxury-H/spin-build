/**
 * SPIN//BUILD idea generator — public API (docs/ARCHITECTURE.md §4.1).
 *
 *   seed → rng → roll genes → recipe → ideaFromRecipe → boringness check
 *        → (≥ threshold) one automatic anti-boring mutation → Idea
 *
 * Every idea is a pure function of its recipe (only `createdAt` and the
 * observation time of inline live trends vary), and every recipe has exactly
 * one URL-safe share code, which doubles as the idea's id.
 *
 * The module-level functions use the shipped datasets. `createGenerator(pool,
 * deps)` builds the same API over any gene pool / synthesis modules (tests,
 * previews, future custom decks).
 */
import type {
  Concept,
  DnaKey,
  Domain,
  FusionExtras,
  Idea,
  IdeaDNA,
  IdeaKind,
  IdeaRecipe,
  Mechanic,
  MutationKind,
  Region,
  SectorId,
  Trend,
} from "@/types";
import { DNA_KEYS } from "@/types";
import { createRng, hashString, ideaNumber, randomSeed, type Rng } from "@/lib/random";
import {
  antiBoringMutation as defaultAntiBoringMutation,
  BORING_THRESHOLD,
  scoreBoringness as defaultScoreBoringness,
  type BoringReport,
} from "./boring";
import { encodeRecipe, decodeRecipe, MAX_SEED_LENGTH, parseRecipe } from "./codec";
import { dailyPlan } from "./daily";
import { planFusion as defaultPlanFusion } from "./fuse";
import { planMutation as defaultPlanMutation } from "./mutate";
import {
  canonicalTrendId,
  comboKey,
  defaultGenePool,
  dnaToRecipeDna,
  freshenLocks,
  genesConflict,
  recipeComboKey,
  resolveDna,
  trendRefId,
  trendRefOf,
  type GeneLike,
  type GenePool,
} from "./pool";
import {
  clampChaos,
  entryWeight,
  pickCompatibleGene,
  recentGeneSets,
  repairDna,
  rollDna,
  type RollOptions,
} from "./roll";
import { synthesizeConcept as defaultSynthesizeConcept, type SynthesisInput } from "./synthesize";

/* ────────────────────────────────────────────────────────────────────────── */
/* Contract types                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

export interface SpinOptions {
  /** 0–100. */
  chaos: number;
  region: Region;
  /** Default: randomSeed(). */
  seed?: string;
  /** "cursed" forces chaos = 100. */
  kind?: IdeaKind;
  /** Gene values to keep verbatim. */
  locked?: Partial<IdeaDNA>;
  /** Forces the trend gene. */
  injectedTrend?: Trend | null;
  /** Scored live+curated trends; default = curated for region. */
  trendPool?: Trend[];
  /** Recent comboKeys to avoid. */
  recent?: string[];
  excludeSectors?: SectorId[];
  /** Tags that bias chaos-modifier choice (from /api/spark). */
  chaosBias?: string[];
}

/** Synthesis modules the generator composes. Injectable for tests. */
export interface GeneratorDeps {
  synthesizeConcept: (input: SynthesisInput) => Concept;
  scoreBoringness: (dna: IdeaDNA, concept: Concept) => BoringReport;
  antiBoringMutation: (dna: IdeaDNA, report: BoringReport) => MutationKind;
  planMutation: (recipe: IdeaRecipe, kind: MutationKind, rng: Rng) => IdeaRecipe;
  planFusion: (a: Idea, b: Idea, rng: Rng) => IdeaRecipe;
  boringThreshold: number;
  /** Clock for `createdAt` and inline-trend observation time. */
  now: () => number;
}

export interface Generator {
  readonly pool: GenePool;
  spinIdea(opts: SpinOptions): Idea;
  rerollIdea(prev: Idea, locks: readonly DnaKey[], opts: Omit<SpinOptions, "locked">): Idea;
  mutateIdea(prev: Idea, kind: MutationKind, locks?: readonly DnaKey[]): Idea;
  fuseIdeas(a: Idea, b: Idea, seed?: string): Idea;
  dailyIdea(date?: Date | string): Idea;
  ideaFromRecipe(recipe: IdeaRecipe): Idea | null;
  ideaFromCode(code: string): Idea | null;
}

/** Re-roll attempts when a spin lands on a recently seen combination. */
export const MAX_RECENT_RETRIES = 6;

const KIND_SET: ReadonlySet<string> = new Set<IdeaKind>(["spin", "daily", "fuse", "cursed"]);

interface SpinInput extends Omit<SpinOptions, "trendPool" | "recent" | "excludeSectors" | "chaosBias"> {
  trendPool?: readonly Trend[];
  recent?: readonly string[];
  excludeSectors?: readonly SectorId[];
  chaosBias?: readonly string[];
}

interface MutationContext {
  /** Genes that must survive the mutation verbatim (locks, injected trend). */
  keep: Partial<IdeaDNA>;
  auto?: boolean;
  now: number;
  trendPool?: readonly Trend[];
  chaosBias?: readonly string[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function normalizeSeed(seed: string | undefined): string {
  const s = typeof seed === "string" ? seed.trim() : "";
  if (!s) return randomSeed();
  if (s.length <= MAX_SEED_LENGTH) return s;
  return `h${hashString(s).toString(36)}${hashString(`${s}#`).toString(36)}`;
}

function copyGene<K extends DnaKey>(out: Partial<IdeaDNA>, dna: IdeaDNA, key: K): void {
  out[key] = dna[key];
}

/** The genes of `dna` named by `keys`. */
export function pickGenes(dna: IdeaDNA, keys: readonly DnaKey[]): Partial<IdeaDNA> {
  const out: Partial<IdeaDNA> = {};
  for (const key of keys) if (DNA_KEYS.includes(key)) copyGene(out, dna, key);
  return out;
}

function sameGeneRef(a: IdeaRecipe["dna"], b: IdeaRecipe["dna"], key: DnaKey): boolean {
  if (key === "trend") return trendRefId(a.trend) === trendRefId(b.trend);
  return a[key] === b[key];
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Factory                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export function createGenerator(
  pool: GenePool = defaultGenePool(),
  overrides: Partial<GeneratorDeps> = {},
): Generator {
  const deps: GeneratorDeps = {
    synthesizeConcept: defaultSynthesizeConcept,
    scoreBoringness: defaultScoreBoringness,
    antiBoringMutation: defaultAntiBoringMutation,
    planMutation: defaultPlanMutation,
    planFusion: defaultPlanFusion,
    boringThreshold: BORING_THRESHOLD,
    now: () => Date.now(),
    ...overrides,
  };
  const noRecent = recentGeneSets([]);

  /** Recipe → idea + its boringness report. Null if the recipe is invalid or names unknown genes. */
  function assemble(input: IdeaRecipe, now: number): { idea: Idea; report: BoringReport } | null {
    if (!input || typeof input !== "object") return null;
    const recipe = parseRecipe({
      ...input,
      chaos: typeof input.chaos === "number" ? clampChaos(input.chaos) : input.chaos,
    });
    if (!recipe) return null;
    const dna = resolveDna(recipe, now, pool);
    if (!dna) return null;

    let fusion: FusionExtras | undefined;
    if (recipe.fusion) {
      const domain = pool.getDomain(recipe.fusion.domain);
      const mechanic = pool.getMechanic(recipe.fusion.mechanic);
      if (!domain || !mechanic) return null;
      fusion = { domain, mechanic, parents: [recipe.fusion.parents[0], recipe.fusion.parents[1]] };
    }

    const concept = deps.synthesizeConcept({
      dna,
      seed: recipe.seed,
      chaos: recipe.chaos,
      mutations: recipe.mutations,
      fusion,
    });
    const report = deps.scoreBoringness(dna, concept);
    const code = encodeRecipe(recipe);
    const boringness = Number.isFinite(report.score)
      ? Math.round(Math.min(100, Math.max(0, report.score)))
      : 0;
    const idea: Idea = {
      id: code,
      code,
      number: ideaNumber(recipe.seed),
      recipe,
      dna,
      ...(fusion ? { fusion } : {}),
      concept,
      autoMutated: recipe.auto === true,
      boringness,
      createdAt: now,
    };
    return { idea, report };
  }

  /**
   * Live trends lose their url/heat/score in the recipe (codes stay short). For
   * the idea the user actually spun, put those display fields back.
   */
  function withTrendDisplay(idea: Idea, source: Trend): Idea {
    if ("id" in idea.recipe.dna.trend) return idea;
    const current = idea.dna.trend;
    if (source === current || canonicalTrendId(source, pool) !== current.id) return idea;
    const trend: Trend = { ...current, score: source.score, timestamp: source.timestamp };
    if (source.url) trend.url = source.url;
    if (source.heat) trend.heat = source.heat;
    if (source.sources && source.sources.length > 0) trend.sources = [...source.sources];
    return { ...idea, dna: { ...idea.dna, trend } };
  }

  function fusionAnchors(recipe: IdeaRecipe): GeneLike[] {
    if (!recipe.fusion) return [];
    const anchors: GeneLike[] = [];
    const d = pool.getDomain(recipe.fusion.domain);
    const m = pool.getMechanic(recipe.fusion.mechanic);
    if (d) anchors.push(d);
    if (m) anchors.push(m);
    return anchors;
  }

  /**
   * planMutation + the guarantees around it: identity (seed/kind/region) is
   * preserved, kept genes are restored, unknown gene ids fall back to the
   * previous genes, and any conflict a swapped gene introduces is re-rolled.
   */
  function applyMutation(base: IdeaRecipe, mutation: MutationKind, rng: Rng, ctx: MutationContext): Idea | null {
    const planned = deps.planMutation(base, mutation, rng);
    const mutations =
      Array.isArray(planned.mutations) && planned.mutations.length > base.mutations.length
        ? [...planned.mutations]
        : [...base.mutations, mutation];
    const fusion = planned.fusion ?? base.fusion;
    let recipe: IdeaRecipe = {
      v: 1,
      kind: base.kind,
      seed: base.seed,
      chaos: typeof planned.chaos === "number" ? clampChaos(planned.chaos) : base.chaos,
      region: base.region,
      dna: { ...(planned.dna ?? base.dna) },
      mutations,
      ...(ctx.auto || base.auto ? { auto: true } : {}),
      ...(fusion ? { fusion } : {}),
    };

    const restoreKept = (dnaRefs: IdeaRecipe["dna"]): IdeaRecipe["dna"] => {
      const out = { ...dnaRefs };
      const k = ctx.keep;
      if (k.domain) out.domain = k.domain.id;
      if (k.target) out.target = k.target.id;
      if (k.mechanic) out.mechanic = k.mechanic.id;
      if (k.trend) out.trend = trendRefOf(k.trend, pool);
      if (k.chaos) out.chaos = k.chaos.id;
      if (k.constraint) out.constraint = k.constraint.id;
      return out;
    };
    recipe.dna = restoreKept(recipe.dna);

    let dna = resolveDna(recipe, ctx.now, pool);
    if (!dna) {
      // The plan named genes this pool does not know: keep the mutation, drop the swaps.
      recipe = { ...recipe, dna: restoreKept({ ...base.dna }) };
      dna = resolveDna(recipe, ctx.now, pool);
      if (!dna) return null;
    }
    if (recipe.fusion && fusionAnchors(recipe).length < 2) {
      recipe = { ...recipe, fusion: base.fusion };
      if (!recipe.fusion) delete recipe.fusion;
    }

    const keepKeys = new Set<DnaKey>(
      DNA_KEYS.filter((key) => ctx.keep[key] !== undefined || sameGeneRef(recipe.dna, base.dna, key)),
    );
    const repaired = repairDna(
      rng.fork("repair"),
      dna,
      keepKeys,
      {
        chaos: recipe.chaos,
        region: recipe.region,
        trendPool: ctx.trendPool,
        chaosBias: ctx.chaosBias,
        anchors: fusionAnchors(recipe),
      },
      pool,
    );
    if (repaired !== dna) recipe = { ...recipe, dna: dnaToRecipeDna(repaired, pool) };
    return assemble(recipe, ctx.now)?.idea ?? null;
  }

  function spinCore(opts: SpinInput, now: number): Idea {
    const seed = normalizeSeed(opts.seed);
    const kind: IdeaKind = opts.kind && KIND_SET.has(opts.kind) ? opts.kind : "spin";
    const chaos = kind === "cursed" ? 100 : clampChaos(opts.chaos);
    const region: Region = opts.region === "VN" ? "VN" : "GLOBAL";
    const rng = createRng(seed);
    const locked = freshenLocks(opts.locked, pool);
    const injected = opts.injectedTrend ?? null;
    const rollOpts: RollOptions = {
      chaos,
      region,
      locked,
      injectedTrend: injected,
      trendPool: opts.trendPool,
      recent: opts.recent,
      excludeSectors: opts.excludeSectors,
      chaosBias: opts.chaosBias,
    };
    const toRecipe = (dna: IdeaDNA): IdeaRecipe => ({
      v: 1,
      kind,
      seed,
      chaos,
      region,
      dna: dnaToRecipeDna(dna, pool),
      mutations: [],
    });

    const recent = new Set(opts.recent ?? []);
    let dna = rollDna(rng.fork("genes"), rollOpts, pool);
    let recipe = toRecipe(dna);
    for (let n = 1; n <= MAX_RECENT_RETRIES && recent.has(recipeComboKey(recipe)); n++) {
      dna = rollDna(rng.fork(`retry-${n}`), rollOpts, pool);
      recipe = toRecipe(dna);
    }

    const built = assemble(recipe, now);
    if (!built) {
      throw new Error(`generator: rolled genes failed to assemble (${recipeComboKey(recipe)})`);
    }
    let idea = built.idea;

    if (built.report.score >= deps.boringThreshold) {
      const mutation = deps.antiBoringMutation(built.idea.dna, built.report);
      const improved = applyMutation(recipe, mutation, rng.fork("anti-boring"), {
        keep: injected ? { ...locked, trend: injected } : locked,
        auto: true,
        now,
        trendPool: opts.trendPool,
        chaosBias: opts.chaosBias,
      });
      if (improved) idea = improved;
    }
    return withTrendDisplay(idea, dna.trend);
  }

  function spinIdea(opts: SpinOptions): Idea {
    return spinCore(opts, deps.now());
  }

  function rerollIdea(prev: Idea, locks: readonly DnaKey[], opts: Omit<SpinOptions, "locked">): Idea {
    const kind = opts.kind ?? (prev.recipe.kind === "cursed" ? "cursed" : "spin");
    // Never "reroll" into the exact idea on screen.
    const recent = [...(opts.recent ?? []), comboKey(prev.dna)];
    return spinCore({ ...opts, kind, recent, locked: pickGenes(prev.dna, locks) }, deps.now());
  }

  function mutateIdea(prev: Idea, kind: MutationKind, locks: readonly DnaKey[] = []): Idea {
    const rng = createRng(`${prev.recipe.seed}:m${prev.recipe.mutations.length}:${kind}`);
    const next = applyMutation(prev.recipe, kind, rng, {
      keep: freshenLocks(pickGenes(prev.dna, locks), pool),
      now: deps.now(),
    });
    // Only null when the previous idea's own genes no longer exist in the pool.
    return next ? withTrendDisplay(next, prev.dna.trend) : prev;
  }

  function fuseIdeas(a: Idea, b: Idea, seed?: string): Idea {
    const fuseSeed = normalizeSeed(
      seed ?? `f${hashString(`fuse|${a.code}|${b.code}`).toString(36).padStart(7, "0")}`,
    );
    const rng = createRng(fuseSeed);
    const now = deps.now();
    const planned = deps.planFusion(a, b, rng);
    const chaos =
      typeof planned.chaos === "number"
        ? clampChaos(planned.chaos)
        : clampChaos((a.recipe.chaos + b.recipe.chaos) / 2);
    const region: Region =
      planned.region === "VN" || planned.region === "GLOBAL" ? planned.region : a.recipe.region;
    const plannedFusion = planned.fusion ?? {
      domain: b.dna.domain.id,
      mechanic: b.dna.mechanic.id,
      parents: [a.concept.name, b.concept.name] as [string, string],
    };

    let recipeDna: IdeaRecipe["dna"] = { ...(planned.dna ?? a.recipe.dna) };
    let resolved = resolveDna({ ...a.recipe, region, dna: recipeDna }, now, pool);
    if (!resolved) {
      recipeDna = { ...a.recipe.dna };
      resolved = resolveDna({ ...a.recipe, region, dna: recipeDna }, now, pool);
    }
    const plannedDomain = pool.getDomain(plannedFusion.domain) ?? pool.getDomain(b.dna.domain.id);
    const plannedMechanic =
      pool.getMechanic(plannedFusion.mechanic) ?? pool.getMechanic(b.dna.mechanic.id);
    // Only reachable when a parent was generated from genes this pool no longer has.
    if (!resolved || !plannedDomain || !plannedMechanic) return a;
    const dna: IdeaDNA = resolved;

    // 1. The B side must be compatible with A's core (domain + trend).
    const core: GeneLike[] = [dna.domain, dna.trend];
    const clashesWithCore = (gene: GeneLike) => core.some((g) => genesConflict(g, gene));
    let fDomain: Domain = plannedDomain;
    if (clashesWithCore(fDomain)) {
      const sameSector = (pool.domainsBySector.get(fDomain.sector) ?? []).filter(
        (d) => !clashesWithCore(d),
      );
      fDomain = pickCompatibleGene(
        rng.fork("fuse-domain"),
        sameSector.length > 0 ? sameSector : pool.domains,
        core,
        (d) => entryWeight(d, "domain", chaos, noRecent),
      );
    }
    let fMechanic: Mechanic = plannedMechanic;
    const againstMechanic: GeneLike[] = [...core, fDomain];
    if (againstMechanic.some((g) => genesConflict(g, fMechanic))) {
      fMechanic = pickCompatibleGene(rng.fork("fuse-mechanic"), pool.mechanics, againstMechanic, (m) =>
        entryWeight(m, "mechanic", chaos, noRecent),
      );
    }

    // 2. A's remaining genes yield to the fused pair when they clash.
    const repaired = repairDna(
      rng.fork("fuse-repair"),
      dna,
      new Set<DnaKey>(["domain", "trend"]),
      { chaos, region, anchors: [fDomain, fMechanic] },
      pool,
    );

    const recipe: IdeaRecipe = {
      v: 1,
      kind: "fuse",
      seed: fuseSeed,
      chaos,
      region,
      dna: repaired === dna ? recipeDna : dnaToRecipeDna(repaired, pool),
      mutations: Array.isArray(planned.mutations) ? [...planned.mutations] : [],
      fusion: {
        domain: fDomain.id,
        mechanic: fMechanic.id,
        parents: [plannedFusion.parents[0], plannedFusion.parents[1]],
      },
    };
    const built = assemble(recipe, now);
    return built ? withTrendDisplay(built.idea, a.dna.trend) : a;
  }

  function dailyIdea(date?: Date | string): Idea {
    const plan = dailyPlan(date, deps.now());
    return spinCore(
      {
        chaos: plan.chaos,
        region: "GLOBAL",
        seed: plan.seed,
        kind: "daily",
        trendPool: pool.trendsFor("GLOBAL"),
        recent: [],
      },
      plan.createdAt,
    );
  }

  function ideaFromRecipe(recipe: IdeaRecipe): Idea | null {
    return assemble(recipe, deps.now())?.idea ?? null;
  }

  function ideaFromCode(code: string): Idea | null {
    const recipe = decodeRecipe(code);
    return recipe ? ideaFromRecipe(recipe) : null;
  }

  return {
    pool,
    spinIdea,
    rerollIdea,
    mutateIdea,
    fuseIdeas,
    dailyIdea,
    ideaFromRecipe,
    ideaFromCode,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Default generator (shipped datasets)                                       */
/* ────────────────────────────────────────────────────────────────────────── */

let shared: Generator | null = null;
function generator(): Generator {
  if (!shared) shared = createGenerator();
  return shared;
}

export function spinIdea(opts: SpinOptions): Idea {
  return generator().spinIdea(opts);
}

/** New idea keeping the genes named in `locks` from `prev`; never returns `prev`'s exact combination when avoidable. */
export function rerollIdea(prev: Idea, locks: readonly DnaKey[], opts: Omit<SpinOptions, "locked">): Idea {
  return generator().rerollIdea(prev, locks, opts);
}

/**
 * Deterministic mutation of `prev` (same idea + kind ⇒ same result). `locks`
 * (optional, beyond the contract) keeps those genes even if the plan swaps them.
 */
export function mutateIdea(prev: Idea, kind: MutationKind, locks?: readonly DnaKey[]): Idea {
  return generator().mutateIdea(prev, kind, locks);
}

/** FUSE: deterministic for a given (a, b, seed); the default seed derives from both codes. */
export function fuseIdeas(a: Idea, b: Idea, seed?: string): Idea {
  return generator().fuseIdeas(a, b, seed);
}

/** Same UTC date ⇒ identical idea for everyone (curated GLOBAL trends only). */
export function dailyIdea(date?: Date | string): Idea {
  return generator().dailyIdea(date);
}

export function ideaFromRecipe(recipe: IdeaRecipe): Idea | null {
  return generator().ideaFromRecipe(recipe);
}

export function ideaFromCode(code: string): Idea | null {
  return generator().ideaFromCode(code);
}

export { encodeRecipe, decodeRecipe, ideaRecipeSchema, looksLikeCode, parseRecipe } from "./codec";
export { comboKey, recipeComboKey, createGenePool, defaultGenePool, dnaConflicts } from "./pool";
export type { GenePool, GenePoolSource, ConflictPair } from "./pool";
export { dailyPlan } from "./daily";
export type { DailyPlan } from "./daily";
export { synthesizeConcept } from "./synthesize";
export { scoreBoringness, BORING_THRESHOLD } from "./boring";
export { buildBrief, briefToPrompt, ideaToText, ideaShareText } from "./brief";
