/**
 * SPIN//BUILD — shared type contract.
 *
 * Every module (datasets, random engine, generator, trend engine, storage,
 * store, UI) builds against these types. Change them deliberately: data files,
 * share codes and localStorage records all depend on their shape.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/* Primitives                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export type Region = "GLOBAL" | "VN";
export const REGIONS: readonly Region[] = ["GLOBAL", "VN"] as const;
export const REGION_LABEL: Record<Region, string> = {
  GLOBAL: "GLOBAL",
  VN: "VIETNAM",
};

/** The six genes of an idea, in display order. */
export type DnaKey =
  | "domain"
  | "target"
  | "mechanic"
  | "trend"
  | "chaos"
  | "constraint";
export const DNA_KEYS: readonly DnaKey[] = [
  "domain",
  "target",
  "mechanic",
  "trend",
  "chaos",
  "constraint",
] as const;
export const DNA_LABEL: Record<DnaKey, string> = {
  domain: "DOMAIN",
  target: "TARGET",
  mechanic: "MECHANIC",
  trend: "TREND",
  chaos: "CHAOS",
  constraint: "CONSTRAINT",
};

/** The 18 wheel sectors. Order is fixed in `data/sectors.ts`. */
export type SectorId =
  | "ai"
  | "social"
  | "productivity"
  | "music"
  | "fashion"
  | "food"
  | "finance"
  | "education"
  | "gaming"
  | "dating"
  | "fitness"
  | "travel"
  | "devtools"
  | "creator"
  | "marketplace"
  | "entertainment"
  | "weird"
  | "utilities";

export interface Sector {
  id: SectorId;
  /** Uppercase wheel label, e.g. "DEVELOPER TOOLS". */
  label: string;
  /** 1-based position on the wheel, clockwise from 12 o'clock. */
  index: number;
  /** Emoji or symbol icon for fast visual recognition. */
  icon?: string;
  /** Friendly Vietnamese label. */
  labelVi?: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Dataset entries                                                            */
/*                                                                            */
/* String fields marked "template" may contain these placeholders, which the  */
/* synthesizer resolves from the other genes of the same idea:                */
/*   {users}    target.plural        "university students"                    */
/*   {user}     target.singular      "a university student"                   */
/*   {activity} domain.activity      "studying"                               */
/*   {thing}    domain.thing         "study session"                          */
/*   {things}   domain.things        "study sessions"                         */
/*   {product}  domain.product       "study room"                             */
/*   {trend}    trend.title (as-is)  "AI agents"                              */
/* Never invent other placeholders. See docs/ARCHITECTURE.md → Grammar.       */
/* ────────────────────────────────────────────────────────────────────────── */

export interface DatasetEntry {
  /** kebab-case, unique within its dataset, stable forever (used in share codes). */
  id: string;
  /**
   * 0–100. Where on the chaos scale this entry feels at home.
   * 0 = sober SaaS, 50 = experimental, 100 = cursed-but-buildable.
   */
  weirdness: number;
  /** Base frequency multiplier. Default 1. Use 0.3–0.6 for niche entries. */
  weight?: number;
  /** lowercase kebab-case tags for compatibility + matching (e.g. "camera", "realtime", "ai"). */
  tags: string[];
  /** ids or tags this entry should never be combined with. */
  conflicts?: string[];
}

export interface Domain extends DatasetEntry {
  sector: SectorId;
  /** Title case, e.g. "Study & focus". */
  label: string;
  /** Uppercase, ≤ 18 chars, e.g. "PRODUCTIVITY". Shown in DNA readouts. */
  short: string;
  /** Gerund of the core activity, lowercase: "studying", "cooking", "budgeting". */
  activity: string;
  /** Singular object users deal with: "study session", "recipe", "expense". */
  thing: string;
  /** Plural of thing: "study sessions". */
  things: string;
  /** Noun phrase naming the kind of product: "study room", "recipe box", "expense log". */
  product: string;
  /** 3–5 template pain statements: "{users} lose whole evenings to 'five more minutes' of scrolling". */
  problems: string[];
  /** 4–8 UPPERCASE single words for idea names: ["FOCUS", "DEADLINE", "PROCRASTINATION"]. */
  nameWords: string[];
  /** Domain-specific APIs/data sources worth using: ["Open Food Facts API"]. */
  apis?: string[];
}

export interface Target extends DatasetEntry {
  /** Title case: "University students". */
  label: string;
  /** Uppercase, ≤ 18 chars: "STUDENTS". */
  short: string;
  /** Lowercase plural used mid-sentence: "university students". */
  plural: string;
  /** With article: "a university student". */
  singular: string;
  /** When/where they feel the need: "during exam season". */
  context: string;
  /** 2–4 template pains: "cramming alone at 2am". Lowercase fragments. */
  pains: string[];
  /** 2–3 motivations, lowercase fragments: "bragging rights", "not failing". */
  motivations: string[];
  /** 2–5 UPPERCASE words for names: ["CAMPUS", "DORM"]. */
  nameWords: string[];
}

export interface Mechanic extends DatasetEntry {
  /** Title case: "Multiplayer". */
  label: string;
  /** Uppercase ≤ 18 chars: "MULTIPLAYER". */
  short: string;
  /** Pre-noun modifier: "multiplayer", "camera-first", "voice-only", "map-based". */
  adjective: string;
  /** 3rd-person verb phrase describing what the mechanic does: "puts everyone in one live room". */
  verb: string;
  /** Why this mechanic is compelling, one sentence fragment: "progress is visible to everyone in real time". */
  hook: string;
  /** 2–3 template core-loop steps, imperative: "Join a live room with other {users}". */
  loop: string[];
  /** 2–4 concrete MVP features: "Room codes with 4-letter join links". */
  mvp: string[];
  /** Suggested stack pieces: [{ layer: "REALTIME", name: "Supabase Realtime" }]. */
  stack: StackItem[];
  /** Browser/platform APIs needed: ["WebSocket", "getUserMedia"]. */
  apis: string[];
  /** 1 (trivial) – 5 (serious engineering). */
  complexity: 1 | 2 | 3 | 4 | 5;
  /** 2–5 UPPERCASE words: ["PARTY", "ROOM", "SQUAD"]. */
  nameWords: string[];
}

export interface ChaosModifier extends DatasetEntry {
  /** Uppercase ≤ 18 chars display label: "HOSTILE UX". */
  short: string;
  /** The rule as a full sentence: "The app gets increasingly angry at the user." */
  text: string;
  /**
   * Template clause that follows "A {adjective} {product} for {users} ___".
   * Must start with "where", "that", "but", "and", "which" or "until".
   * e.g. "where the app gets visibly angrier every time nobody is {activity}".
   */
  clause: string;
  /** Template core-loop step this rule adds: "The app's patience meter drains; its tone escalates." */
  twist: string;
  /** Why the rule makes the idea interesting, one sentence. */
  hook: string;
  /** One concrete MVP feature the rule demands: "5-stage anger meter with escalating copy". */
  mvp: string;
  /** 1–4 UPPERCASE words for names: ["BOSS", "RAGE"]. */
  nameWords: string[];
  /** 0–100 contribution to the (non-scientific) viral potential. */
  viral: number;
}

export interface Constraint extends DatasetEntry {
  /** Uppercase ≤ 18 chars: "NO LOGIN". */
  short: string;
  /** Full sentence: "No login." / "Buildable in 24 hours." */
  text: string;
  /** How it shapes the build, one template sentence: "Rooms are anonymous and joined via 4-letter codes." */
  implication: string;
  /** Stack pieces this constraint adds. */
  stackAdd?: StackItem[];
  /** Stack layers or tags this constraint removes, e.g. ["DATA", "auth"]. */
  stackRemove?: string[];
  /** Difficulty delta, -2 (simplifies) … +3 (much harder). */
  effort: number;
  /** Caps the estimate, e.g. "1 DAY" for "Buildable in 24 hours". */
  estimateCap?: Estimate;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Trends                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type TrendSourceId =
  | "gif" // GIF / meme trending search terms
  | "tech" // Hacker / technology top stories
  | "video" // Popular video metadata
  | "search" // Search trend data
  | "community" // Community hot/rising posts
  | "curated"; // Local curated fallback

export const TREND_SOURCE_LABEL: Record<TrendSourceId, string> = {
  gif: "Memes",
  tech: "Technology",
  video: "Video",
  search: "Search",
  community: "Community",
  curated: "Curated",
};

export type TrendCategory =
  | "AI"
  | "TECH"
  | "CULTURE"
  | "MEME"
  | "MUSIC"
  | "VIDEO"
  | "LIFESTYLE"
  | "FINANCE"
  | "GAMING"
  | "SPORTS"
  | "NEWS"
  | "SCIENCE"
  | "DESIGN"
  | "OTHER";

/** Normalized trend. Every provider maps into this shape. */
export interface Trend {
  /** Stable id: `${source}:${slug(title)}` (curated: `curated:<slug>`). */
  id: string;
  /** Short display title, e.g. "AI agents". ≤ 60 chars. */
  title: string;
  /** Primary source this record came from. */
  source: TrendSourceId;
  category: TrendCategory;
  /** Internal 0–100 roulette weight. NOT a claim about objective popularity. */
  score: number;
  url?: string;
  /** Epoch ms when the trend was observed/published. */
  timestamp: number;
  region: Region;
  tags: string[];
  /** All sources this trend was seen across (after cross-source merging). */
  sources?: TrendSourceId[];
  /** Heat label for UI: derived from score + recency. */
  heat?: "HOT" | "RISING" | "STEADY";
  /**
   * How the trend shows up in a product: 3rd-person verb phrase used as
   * "It {angle}." e.g. "lets a personal AI agent do the tedious part".
   * Optional; synthesizer falls back to the trend lexicon / a generic angle.
   */
  angle?: string;
  /** Optional UPPERCASE words for idea names. */
  nameWords?: string[];
}

/**
 * Keyword lexicon used to (a) categorize/tag live trends and score their
 * relevance to app creation, and (b) give live trends a product "angle".
 */
export interface TrendLexiconEntry {
  id: string;
  /** Lowercase keywords/phrases; a trend matches if its title/tags contain any. */
  keywords: string[];
  category: TrendCategory;
  /** 3rd-person verb phrase, used as "It {angle}." */
  angle: string;
  nameWords: string[];
  tags: string[];
  /** 0–1: how naturally this theme turns into a buildable app. */
  relevance: number;
}

export type ProviderState = "ok" | "degraded" | "down" | "disabled";

export interface ProviderHealth {
  id: TrendSourceId;
  name: string;
  state: ProviderState;
  /** Human-readable reason, e.g. "NO API KEY", "TIMEOUT", "HTTP 429". */
  reason?: string;
  lastSuccess?: number;
  lastError?: number;
  /** Circuit breaker: provider skipped until this epoch ms. */
  disabledUntil?: number;
  latencyMs?: number;
  count: number;
}

/** Server-side provider adapter. Never import provider modules into client code. */
export interface TrendProvider<Raw = unknown> {
  id: TrendSourceId;
  name: string;
  /** Relative trust/popularity weight used in scoring, 0–1. */
  weight: number;
  regions: readonly Region[];
  /** False when required credentials are missing (provider reports "disabled"). */
  enabled(): boolean;
  fetchTrends(ctx: { region: Region; signal: AbortSignal }): Promise<Raw>;
  normalize(raw: Raw, ctx: { region: Region; fetchedAt: number }): Trend[];
  health(): ProviderHealth;
}

export type TrendEngineStatus = "ONLINE" | "PARTIAL" | "OFFLINE_CACHE";

export interface TrendSnapshot {
  region: Region;
  status: TrendEngineStatus;
  trends: Trend[];
  providers: ProviderHealth[];
  fetchedAt: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Ideas                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export interface IdeaDNA {
  domain: Domain;
  target: Target;
  mechanic: Mechanic;
  trend: Trend;
  chaos: ChaosModifier;
  constraint: Constraint;
}

/** Extra genes carried by FUSE results (the "B side"). */
export interface FusionExtras {
  domain: Domain;
  mechanic: Mechanic;
  /** Names of the two parent concepts, for display: ["PROCRASTINATION BOSS", "GHOST MENU"]. */
  parents: [string, string];
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "UNHINGED";
export const DIFFICULTIES: readonly Difficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
  "UNHINGED",
];

export type Estimate = "3 HOURS" | "1 DAY" | "WEEKEND" | "1 WEEK";
export const ESTIMATES: readonly Estimate[] = [
  "3 HOURS",
  "1 DAY",
  "WEEKEND",
  "1 WEEK",
];

export type StackLayer =
  | "FRONTEND"
  | "BACKEND"
  | "DATA"
  | "REALTIME"
  | "AI"
  | "API"
  | "DEVICE"
  | "HOSTING";

export interface StackItem {
  layer: StackLayer;
  name: string;
  /** Optional short justification. */
  why?: string;
}

export interface ViralPotential {
  /** 0–100, explicitly vibes-based. */
  score: number;
  /** "LOW SIGNAL" | "GROUP CHAT" | "SCREENSHOT BAIT" | "MAIN CHARACTER" etc. */
  label: string;
  reasons: string[];
}

export interface Concept {
  /** UPPERCASE product name, 1–3 words: "PROCRASTINATION BOSS". */
  name: string;
  /** One sentence. */
  pitch: string;
  /** The distinctive hook, one sentence. */
  hook: string;
  /** WHY IT'S INTERESTING, 1–3 sentences. */
  why: string;
  /** 3–5 imperative steps. */
  coreLoop: string[];
  /** 3–5 concrete MVP features. */
  mvp: string[];
  stack: StackItem[];
  difficulty: Difficulty;
  estimate: Estimate;
  viral: ViralPotential;
}

export type MutationKind =
  | "useful"
  | "viral"
  | "weird"
  | "technical"
  | "social"
  | "simpler"
  | "harder"
  | "cheaper"
  | "chaotic";

export const MUTATIONS: readonly { kind: MutationKind; label: string }[] = [
  { kind: "useful", label: "MORE USEFUL" },
  { kind: "viral", label: "MORE VIRAL" },
  { kind: "weird", label: "MORE WEIRD" },
  { kind: "technical", label: "MORE TECHNICAL" },
  { kind: "social", label: "MORE SOCIAL" },
  { kind: "simpler", label: "SIMPLER" },
  { kind: "harder", label: "HARDER" },
  { kind: "cheaper", label: "CHEAPER" },
  { kind: "chaotic", label: "MORE CHAOTIC" },
];

export type IdeaKind = "spin" | "daily" | "fuse" | "cursed";

/** Reference to a trend inside a recipe: a curated id, or an inline snapshot of a live trend. */
export type TrendRef =
  | { id: string }
  | {
      title: string;
      category: TrendCategory;
      source: TrendSourceId;
      tags: string[];
    };

/** Everything needed to deterministically rebuild an Idea. Serialized into share codes. */
export interface IdeaRecipe {
  v: 1;
  kind: IdeaKind;
  /** base36 seed string. */
  seed: string;
  /** 0–100. */
  chaos: number;
  region: Region;
  dna: {
    domain: string;
    target: string;
    mechanic: string;
    trend: TrendRef;
    chaos: string;
    constraint: string;
  };
  /** Mutations applied in order (affects synthesis wording/scope). */
  mutations: MutationKind[];
  /** Set when the boringness detector auto-mutated this idea. */
  auto?: boolean;
  /** FUSE: secondary genes. */
  fusion?: { domain: string; mechanic: string; parents: [string, string] };
}

export interface Idea {
  /** Unique id; equals `code`. */
  id: string;
  /** URL-safe share code encoding the recipe → /idea/[code]. */
  code: string;
  /** 5-digit display number derived from the seed: "08421". */
  number: string;
  recipe: IdeaRecipe;
  dna: IdeaDNA;
  fusion?: FusionExtras;
  concept: Concept;
  /** True if the boringness detector fired and auto-mutated once. */
  autoMutated: boolean;
  /** 0–100 boringness of the final concept (lower is better). */
  boringness: number;
  /** Epoch ms of generation. */
  createdAt: number;
}

export interface BuildBrief {
  product: string;
  pitch: string;
  userProblem: string;
  coreLoop: string[];
  mvpFeatures: string[];
  dataModel: { entity: string; fields: string[] }[];
  requiredApis: string[];
  techStack: StackItem[];
  implementationSteps: string[];
  constraints: string[];
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Persistence                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface HistoryEntry {
  /** = idea.id */
  id: string;
  timestamp: number;
  seed: string;
  idea: Idea;
  locked: DnaKey[];
  saved: boolean;
}

export type Language = "vi" | "en";

export interface Settings {
  lang: Language;
  chaos: number;
  region: Region;
  audio: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Chaos bands                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface ChaosBand {
  min: number;
  max: number;
  label: string;
  description: string;
}

export const CHAOS_BANDS: readonly ChaosBand[] = [
  { min: 0, max: 20, label: "SANE", description: "Practical SaaS and useful tools." },
  { min: 20, max: 40, label: "CREATIVE", description: "Creative side projects." },
  { min: 40, max: 60, label: "EXPERIMENTAL", description: "Experimental products." },
  { min: 60, max: 80, label: "WEIRD", description: "Weird internet apps." },
  { min: 80, max: 101, label: "CURSED", description: "Cursed but potentially brilliant ideas." },
];

export function chaosBand(chaos: number): ChaosBand {
  return (
    CHAOS_BANDS.find((b) => chaos >= b.min && chaos < b.max) ??
    CHAOS_BANDS[CHAOS_BANDS.length - 1]
  );
}
