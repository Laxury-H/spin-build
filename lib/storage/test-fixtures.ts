/**
 * Contract-complete Idea / HistoryEntry / Trend builders for tests of the
 * storage and store layers. Imported only from *.test.ts files, so it never
 * reaches a bundle. Every fixture passes the storage validators.
 */
import type {
  ChaosModifier,
  Constraint,
  Domain,
  DnaKey,
  HistoryEntry,
  Idea,
  IdeaKind,
  Mechanic,
  Region,
  SectorId,
  Target,
  Trend,
} from "@/types";

const SECTOR_CYCLE: readonly SectorId[] = ["productivity", "food", "gaming", "travel", "weird", "music"];

export function makeTrend(slug: string, region: Region = "GLOBAL"): Trend {
  return {
    id: `curated:${slug}`,
    title: slug.replace(/-/g, " "),
    source: "curated",
    category: "TECH",
    score: 64,
    timestamp: 1_790_000_000_000,
    region,
    tags: ["web"],
    angle: "lets a personal AI agent do the tedious part",
    nameWords: ["AGENT"],
  };
}

export interface IdeaFixtureOptions {
  sector?: SectorId;
  seed?: string;
  chaos?: number;
  kind?: IdeaKind;
  trend?: Trend;
  region?: Region;
}

/** A complete, valid Idea whose gene ids are all suffixed with `n`. */
export function makeIdea(n: number, opts: IdeaFixtureOptions = {}): Idea {
  const sector = opts.sector ?? SECTOR_CYCLE[n % SECTOR_CYCLE.length];
  const seed = opts.seed ?? `s${n.toString(36).padStart(6, "0")}`;
  const domain: Domain = {
    id: `study-room-${n}`,
    weirdness: 20,
    tags: ["web", "realtime"],
    sector,
    label: "Study & focus",
    short: "STUDY",
    activity: "studying",
    thing: "study session",
    things: "study sessions",
    product: "study room",
    problems: ["{users} lose whole evenings to 'five more minutes' of scrolling."],
    nameWords: ["FOCUS", "DEADLINE"],
  };
  const target: Target = {
    id: `students-${n}`,
    weirdness: 25,
    tags: ["mobile"],
    label: "University students",
    short: "STUDENTS",
    plural: "university students",
    singular: "a university student",
    context: "during exam season",
    pains: ["cramming alone at 2am"],
    motivations: ["not failing"],
    nameWords: ["CAMPUS"],
  };
  const mechanic: Mechanic = {
    id: `multiplayer-${n}`,
    weirdness: 35,
    tags: ["multiplayer", "realtime"],
    label: "Multiplayer",
    short: "MULTIPLAYER",
    adjective: "multiplayer",
    verb: "puts everyone in one live room",
    hook: "progress is visible to everyone in real time",
    loop: ["Join a live room with other {users}."],
    mvp: ["Room codes with 4-letter join links"],
    stack: [{ layer: "REALTIME", name: "Supabase Realtime" }],
    apis: ["WebSocket"],
    complexity: 3,
    nameWords: ["SQUAD"],
  };
  const chaos: ChaosModifier = {
    id: `hostile-ux-${n}`,
    weirdness: 70,
    tags: ["text-heavy"],
    short: "HOSTILE UX",
    text: "The app gets increasingly angry at the user.",
    clause: "where the app gets visibly angrier every time nobody is {activity}",
    twist: "The app's patience meter drains; its tone escalates.",
    hook: "Guilt is a surprisingly strong retention loop.",
    mvp: "5-stage anger meter with escalating copy",
    nameWords: ["BOSS"],
    viral: 72,
  };
  const constraint: Constraint = {
    id: `no-login-${n}`,
    weirdness: 10,
    tags: ["anonymous"],
    short: "NO LOGIN",
    text: "No login.",
    implication: "Rooms are anonymous and joined via 4-letter codes.",
    effort: -1,
  };
  const trend = opts.trend ?? makeTrend(`ai-agents-${n}`, opts.region ?? "GLOBAL");
  const code = `c${n.toString(36)}-${seed}`;
  return {
    id: code,
    code,
    number: String(n % 100000).padStart(5, "0"),
    recipe: {
      v: 1,
      kind: opts.kind ?? "spin",
      seed,
      chaos: opts.chaos ?? 42,
      region: opts.region ?? "GLOBAL",
      dna: {
        domain: domain.id,
        target: target.id,
        mechanic: mechanic.id,
        trend: { id: trend.id },
        chaos: chaos.id,
        constraint: constraint.id,
      },
      mutations: [],
    },
    dna: { domain, target, mechanic, trend, chaos, constraint },
    concept: {
      name: "PROCRASTINATION BOSS",
      pitch:
        "A multiplayer study room for university students where the app gets visibly angrier every time nobody is studying.",
      hook: "Progress is visible to everyone in real time.",
      why: "Guilt is a surprisingly strong retention loop.",
      coreLoop: ["Join a live room with other university students.", "Study until the boss calms down."],
      mvp: ["Room codes with 4-letter join links", "5-stage anger meter with escalating copy"],
      stack: [{ layer: "REALTIME", name: "Supabase Realtime" }],
      difficulty: "MEDIUM",
      estimate: "WEEKEND",
      viral: { score: 72, label: "GROUP CHAT", reasons: ["Screenshots of the angry boss travel well."] },
    },
    autoMutated: false,
    boringness: 18,
    createdAt: 1_790_000_000_000 + n,
  };
}

export interface EntryFixtureOptions extends IdeaFixtureOptions {
  timestamp?: number;
  saved?: boolean;
  locked?: DnaKey[];
}

export function makeEntry(n: number, opts: EntryFixtureOptions = {}): HistoryEntry {
  const idea = makeIdea(n, opts);
  return {
    id: idea.id,
    timestamp: opts.timestamp ?? 1_790_000_000_000 + n * 1000,
    seed: idea.recipe.seed,
    idea,
    locked: opts.locked ?? [],
    saved: opts.saved ?? false,
  };
}
