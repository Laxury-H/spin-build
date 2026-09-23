/**
 * The creative heart: six genes in, one product concept out.
 *
 *   name     — chaos-banded name templates over the genes' nameWords
 *   pitch    — "A {adjective} {product} for {users} {clause}." and friends
 *   hook     — the single most distinctive twist
 *   why      — real problem + why the twist is interesting + trend timing
 *   coreLoop — mechanic loop + chaos twist (+ trend step, + constraint step)
 *   mvp      — mechanic + chaos + constraint (+ API, + mutation) features
 *   stack    — mechanic stack ± constraint, platform defaults, ≤ 6 items
 *   effort   — difficulty + estimate from complexity, effort, chaos, mutations
 *   viral    — vibes-based score, tier label and reasons
 *
 * Pure and deterministic: every random choice comes from
 * createRng(`${seed}:synth`) and labelled forks of it.
 */
import type {
  Concept,
  Constraint,
  Difficulty,
  Estimate,
  FusionExtras,
  IdeaDNA,
  Mechanic,
  MutationKind,
  StackItem,
  StackLayer,
  ViralPotential,
} from "@/types";
import { ESTIMATES } from "@/types";
import { createRng, type Rng } from "@/lib/random";
import {
  bandIndex,
  buildFusionPitch,
  buildPitch,
  generateFusionName,
  generateName,
  MUTATION_TWIST_LEADS,
  PROBLEM_LEADS,
  sanitizeNameWords,
  TREND_LEADS,
  TWIST_LEADS,
  type BandIndex,
  type NameWords,
} from "./templates";
import {
  capitalize,
  clampSentence,
  dedupeKey,
  fill,
  fragment,
  lowerFirst,
  resolveTrendAngle,
  sentence,
  stripTerminal,
  tidy,
  toImperative,
  type ResolvedTrendAngle,
} from "./text";

export interface SynthesisInput {
  dna: IdeaDNA;
  seed: string;
  chaos: number;
  mutations: readonly MutationKind[];
  fusion?: FusionExtras;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Context                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type Platform = "web" | "single-file" | "cli" | "browser-extension" | "desktop-widget" | "bot";

interface Ctx {
  dna: IdeaDNA;
  chaos: number;
  band: BandIndex;
  mutations: readonly MutationKind[];
  last: MutationKind | undefined;
  has(kind: MutationKind): boolean;
  fusion?: FusionExtras;
  angle: ResolvedTrendAngle;
  /** Filled trend angle phrase ("lets a personal AI agent do the nagging for you"). */
  angleText: string;
  /** Fill a dataset template against this idea's DNA. */
  f(template: string): string;
  /** Tags across every gene (and the fusion side). */
  tags: ReadonlySet<string>;
  platform: Platform;
}

const STEP_MAX = 110;
const HOOK_MAX = 190;
const WHY_MAX = 430;
const MVP_ITEM_MAX = 120;

function createContext(input: SynthesisInput): Ctx {
  const { dna, fusion } = input;
  const chaos = clamp(Math.round(Number.isFinite(input.chaos) ? input.chaos : 50), 0, 100);
  const mutations = input.mutations ?? [];
  const angle = resolveTrendAngle(dna.trend);
  const f = (template: string) => fill(template, dna);
  const tags = new Set<string>([
    ...dna.domain.tags,
    ...dna.target.tags,
    ...dna.mechanic.tags,
    ...(dna.trend.tags ?? []),
    ...dna.chaos.tags,
    ...dna.constraint.tags,
    ...(fusion ? [...fusion.domain.tags, ...fusion.mechanic.tags] : []),
  ]);
  return {
    dna,
    chaos,
    band: bandIndex(chaos),
    mutations,
    last: mutations[mutations.length - 1],
    has: (kind) => mutations.includes(kind),
    fusion,
    angle,
    angleText: stripTerminal(f(angle.template)),
    f,
    tags,
    platform: detectPlatform(dna),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function hasAny(tags: ReadonlySet<string> | readonly string[], wanted: readonly string[]): boolean {
  const set = tags instanceof Set ? tags : new Set(tags as readonly string[]);
  return wanted.some((t) => set.has(t));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Entry point                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export function synthesizeConcept(input: SynthesisInput): Concept {
  const ctx = createContext(input);
  const rng = createRng(`${input.seed}:synth`);
  const effort = rateEffort(ctx);
  return {
    name: buildName(ctx, rng.fork("name")),
    pitch: buildConceptPitch(ctx, rng.fork("pitch")),
    hook: buildHook(ctx, rng.fork("hook")),
    why: buildWhy(ctx, rng.fork("why")),
    coreLoop: buildCoreLoop(ctx, rng.fork("loop")),
    mvp: buildMvp(ctx, rng.fork("mvp")),
    stack: buildStack(ctx),
    difficulty: effort.difficulty,
    estimate: effort.estimate,
    viral: rateViral(ctx),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Name + pitch                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function nameWordsFor(ctx: Ctx): NameWords {
  const { dna, fusion } = ctx;
  return {
    domain: sanitizeNameWords(dna.domain.nameWords),
    target: sanitizeNameWords(dna.target.nameWords),
    mechanic: sanitizeNameWords(dna.mechanic.nameWords),
    chaos: sanitizeNameWords(dna.chaos.nameWords),
    trend: sanitizeNameWords(ctx.angle.nameWords).filter((w) => w.length <= 10),
    fusion: fusion ? sanitizeNameWords([...fusion.domain.nameWords, ...fusion.mechanic.nameWords]) : [],
  };
}

function buildName(ctx: Ctx, rng: Rng): string {
  const words = nameWordsFor(ctx);
  return ctx.fusion ? generateFusionName(words, rng) : generateName(words, ctx.chaos, rng);
}

/** Mechanic adjective, or "" when the product noun already says it ("multiplayer quiz"). */
function adjectiveFor(mechanic: Mechanic, product: string): string {
  const adj = tidy(mechanic.adjective ?? "");
  if (!adj) return "";
  const p = ` ${product.toLowerCase()} `;
  return p.includes(` ${adj.toLowerCase()} `) ? "" : adj;
}

function chaosClause(ctx: Ctx): string {
  const clause = stripTerminal(ctx.f(ctx.dna.chaos.clause ?? ""));
  if (clause) return lowerFirst(clause);
  return `that ${stripTerminal(ctx.f(ctx.dna.mechanic.verb))}`;
}

function buildConceptPitch(ctx: Ctx, rng: Rng): string {
  const { dna, fusion } = ctx;
  const users = ctx.f("{users}");
  const clause = chaosClause(ctx);
  if (fusion) {
    const adjA = adjectiveFor(dna.mechanic, dna.domain.product);
    const adjB = adjectiveFor(fusion.mechanic, fusion.domain.product);
    return buildFusionPitch(
      {
        adjectiveA: adjA,
        productA: ctx.f("{product}"),
        adjectiveB: adjB.toLowerCase() === adjA.toLowerCase() ? "" : adjB,
        productB: tidy(fusion.domain.product) || "second product",
        users,
        clause,
      },
      rng,
    );
  }
  return buildPitch(
    { adjective: adjectiveFor(dna.mechanic, dna.domain.product), product: ctx.f("{product}"), users, clause },
    ctx.chaos,
    ctx.mutations,
    rng,
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hook                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function buildHook(ctx: Ctx, rng: Rng): string {
  const { dna, fusion } = ctx;
  const rule = stripTerminal(ctx.f(dna.chaos.text));
  const mechHook = stripTerminal(ctx.f(dna.mechanic.hook));
  const verb = stripTerminal(ctx.f(dna.mechanic.verb));
  const candidates: { text: string; weight: number }[] = [];
  const add = (text: string, weight: number) => {
    if (text && weight > 0) candidates.push({ text: sentence(text), weight });
  };

  if (fusion) {
    const hookB = stripTerminal(ctx.f(fusion.mechanic.hook));
    add(`${capitalize(mechHook)}, and ${lowerFirst(hookB)}`, 2);
    add(`${rule}, and ${lowerFirst(hookB)}`, 2);
    add(`It is a ${ctx.f("{product}")} and a ${tidy(fusion.domain.product)} at once: ${lowerFirst(rule)}`, 1.5);
  } else {
    const weakRule = dna.chaos.weirdness < 20 && ctx.chaos < 30;
    add(`${rule}, and ${lowerFirst(mechHook)}`, weakRule ? 1 : 3);
    add(`${capitalize(mechHook)}, while ${lowerFirst(rule)}`, 1.5);
    if (ctx.angle.source !== "generic") add(`${rule}, and it ${ctx.angleText}`, 2 * ctx.angle.relevance);
    add(`It ${verb}, so ${lowerFirst(mechHook)}`, weakRule || ctx.has("useful") ? 3 : 0.6);
    if (ctx.has("viral")) add(`${rule}, and every result is built to be shared`, 2.5);
  }
  const fitting = candidates.filter((c) => c.text.length <= HOOK_MAX);
  if (fitting.length > 0) return rng.weighted(fitting, (c) => c.weight).text;
  if (rule) return clampSentence(rule, HOOK_MAX);
  return clampSentence(mechHook || verb, HOOK_MAX);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Why                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function leadIn(lead: string, body: string): string {
  const b = stripTerminal(body);
  if (!lead) return sentence(b);
  return sentence(`${lead}${lowerFirst(b)}`);
}

function problemSentence(ctx: Ctx, rng: Rng): string {
  const { domain, target } = ctx.dna;
  const problems = domain.problems.filter((p) => p.trim());
  const pains = target.pains.filter((p) => p.trim());
  const usePain = pains.length > 0 && target.context && (problems.length === 0 || rng.chance(0.3));
  if (usePain) {
    const pain = stripTerminal(ctx.f(rng.pick(pains)));
    const context = stripTerminal(ctx.f(target.context));
    return sentence(`The pain peaks ${context} for ${ctx.f("{users}")}: ${lowerFirst(pain)}`);
  }
  if (problems.length > 0) {
    const lead = rng.pick(PROBLEM_LEADS[ctx.band]);
    return leadIn(lead, ctx.f(rng.pick(problems)));
  }
  return sentence(`${ctx.f("{users}")} have no good way to keep ${ctx.f("{activity}")} fun and on track`);
}

function twistSentence(ctx: Ctx, rng: Rng): string {
  const { dna, fusion } = ctx;
  if (fusion) {
    const hookB = stripTerminal(ctx.f(fusion.mechanic.hook));
    return sentence(`Crossing a ${ctx.f("{product}")} with a ${tidy(fusion.domain.product)} means ${lowerFirst(hookB)}`);
  }
  const mutationLeads = ctx.last ? MUTATION_TWIST_LEADS[ctx.last] : undefined;
  const lead = rng.pick(mutationLeads ?? TWIST_LEADS[ctx.band]);
  const mechanicLine = `it ${stripTerminal(ctx.f(dna.mechanic.verb))}, so ${lowerFirst(stripTerminal(ctx.f(dna.mechanic.hook)))}`;
  const chaosHook = ctx.f(dna.chaos.hook);
  const preferMechanic = ctx.last === "useful" || (ctx.band === 0 && dna.chaos.weirdness < 15 && rng.chance(0.5));
  const body = preferMechanic || !chaosHook ? mechanicLine : chaosHook;
  return lead ? leadIn(lead, body) : sentence(capitalize(stripTerminal(body)));
}

function trendSentence(ctx: Ctx, rng: Rng): string {
  if (!ctx.angleText) return "";
  const lead = rng.pick(TREND_LEADS[ctx.band]);
  return sentence(`${lead} ${ctx.angleText}`);
}

function buildWhy(ctx: Ctx, rng: Rng): string {
  const parts = [problemSentence(ctx, rng), twistSentence(ctx, rng)].filter(Boolean);
  if (ctx.fusion) {
    const rule = ctx.f(ctx.dna.chaos.hook);
    if (rule) parts.push(leadIn(rng.pick(TWIST_LEADS[ctx.band]), rule));
  } else {
    parts.push(trendSentence(ctx, rng));
  }
  const kept = parts.filter(Boolean).slice(0, 3);
  while (kept.length > 1 && kept.join(" ").length > WHY_MAX) kept.pop();
  return kept.join(" ");
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Core loop                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const CONSTRAINT_CLOSERS: readonly (readonly [readonly string[], string])[] = [
  [["offline-capable", "local-first", "offline"], "Close the app offline; every {thing} is already saved on the device."],
  [["anonymous", "no-auth", "no-login", "no-account"], "Leave without an account; the link is the only key."],
  [["sms"], "Get the next nudge as a text message."],
  [["email"], "Get the recap in your inbox the next morning."],
  [["bot"], "Keep going inside the group chat through the bot."],
  [["wearable"], "Glance at your wrist for the next prompt."],
  [["browser-extension"], "Trigger it from the toolbar on whatever page you are on."],
  [["cli"], "Run it again from the terminal tomorrow."],
  [["desktop-widget"], "Leave the widget pinned and let it react on its own."],
  [["ephemeral", "self-destruct"], "Watch everything disappear when the session ends."],
  [["time-limit", "timer"], "Stop when the timer hits zero, finished or not."],
];

const MECHANIC_CLOSERS: readonly (readonly [readonly string[], string])[] = [
  [["competitive"], "Compare scores on the weekly board."],
  [["strangers"], "Rate the match, then get paired with someone new."],
  [["multiplayer"], "End the session and see how the whole group did."],
  [["async-social"], "Come back later to see how others responded."],
  [["ugc"], "Publish the result so others can remix it."],
  [["generator"], "Keep the best version and throw the rest away."],
  [["game"], "Start the next round with the score carried over."],
  [["maps", "location"], "Drop a pin so the next person finds it."],
];

const DEFAULT_CLOSER = "Come back tomorrow; yesterday's {thing} is waiting.";

function closerFor(tags: readonly string[], table: readonly (readonly [readonly string[], string])[]): string | undefined {
  return table.find(([wanted]) => hasAny(tags, wanted))?.[1];
}

interface Step {
  text: string;
  priority: number;
  order: number;
}

function step(ctx: Ctx, template: string): string {
  const text = ctx.f(template);
  return text ? clampSentence(text, STEP_MAX) : "";
}

function buildCoreLoop(ctx: Ctx, rng: Rng): string[] {
  const { dna, fusion } = ctx;
  const steps: Step[] = [];
  const push = (text: string, priority: number, order: number) => {
    if (text) steps.push({ text, priority, order });
  };

  const loopA = dna.mechanic.loop.filter((s) => s.trim());
  const loopB = fusion ? fusion.mechanic.loop.filter((s) => s.trim()) : [];
  if (fusion) {
    // Interleave both mechanics: A0, B0, A1, twist, B1, A2 …
    const priA = [10, 9, 6.5];
    const priB = [9.5, 7.5, 6];
    loopA.slice(0, 3).forEach((s, i) => push(step(ctx, s), priA[i] ?? 5, i * 2));
    loopB.slice(0, 3).forEach((s, i) => push(step(ctx, s), priB[i] ?? 5, i * 2 + 1 + (i >= 1 ? 1 : 0)));
    push(step(ctx, dna.chaos.twist), 10, 2.5);
  } else {
    const pri = [10, 9, 7];
    loopA.slice(0, 3).forEach((s, i) => push(step(ctx, s), pri[i] ?? 5, i < 2 ? i : 3));
    push(step(ctx, dna.chaos.twist), 10, 2);
  }

  // Mutations that change how people move through the loop.
  if (ctx.has("social")) push(step(ctx, "Invite friends with one link before you start."), 8.6, 0.5);
  if (ctx.has("viral")) push(step(ctx, "Share the result as a card; every view is a new invite."), 8.5, 8);

  // A trend-derived step, only when the trend has a real product angle.
  if (ctx.angle.source !== "generic" && ctx.angle.relevance >= 0.5) {
    const imperative = toImperative(ctx.angleText);
    if (imperative) push(clampSentence(imperative, STEP_MAX), 4 + ctx.angle.relevance * 3, 6);
  }

  // A constraint-shaped step (or a mechanic-shaped closer when the constraint has no loop shape).
  const constraintCloser = closerFor(dna.constraint.tags, CONSTRAINT_CLOSERS);
  if (constraintCloser) push(step(ctx, constraintCloser), 7.2, 9);
  else {
    const mechanicTags = fusion ? [...dna.mechanic.tags, ...fusion.mechanic.tags] : dna.mechanic.tags;
    push(step(ctx, closerFor(mechanicTags, MECHANIC_CLOSERS) ?? DEFAULT_CLOSER), 5.5, 9);
  }

  // Dedupe, keep the five most important, restore narrative order.
  const seen = new Set<string>();
  const unique = steps.filter((s) => {
    const key = dedupeKey(s.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const top = [...unique].sort((a, b) => b.priority - a.priority || a.order - b.order).slice(0, 5);
  const loop = top.sort((a, b) => a.order - b.order).map((s) => s.text);

  // Guarantee at least three steps even with sparse data.
  const extras = [DEFAULT_CLOSER, "Share the result with one person who would get it.", "Start again with a fresh {thing}."];
  for (const extra of rng.shuffle(extras)) {
    if (loop.length >= 3) break;
    const s = step(ctx, extra);
    if (s && !loop.some((x) => dedupeKey(x) === dedupeKey(s))) loop.push(s);
  }
  return loop;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* MVP                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

const MUTATION_FEATURES: Partial<Record<MutationKind, readonly string[]>> = {
  useful: [
    "CSV export of every {thing}",
    "Reminder timed to the moment {users} usually drop off",
    "Weekly one-screen summary of past {things}",
    "Search and filters across every past {thing}",
  ],
  viral: [
    "Auto-generated share card for every {thing}, sized for stories",
    "One-tap share link with a live preview image",
    "Public result page with a 'make your own' button",
  ],
  social: [
    "Invite link that drops a friend straight into your {thing}",
    "Group feed of everyone's {things}",
    "Friend reactions on each {thing}",
  ],
  technical: [
    "Event log that can replay any {thing} step by step",
    "Offline-first sync with conflict resolution",
    "Background job queue with retries for slow work",
  ],
  harder: [
    "Spectator mode so other {users} can watch live",
    "Monthly season with a reset ladder",
    "Public API so others can build on {things}",
  ],
  chaotic: [
    "Random event engine that rewrites one rule per session",
    "Spectator mode so other {users} can watch live",
  ],
  weird: ["Hidden settings page that only unlocks after a week of use"],
  cheaper: ["Static export that runs on a free host with no server"],
};

interface Feature {
  text: string;
  priority: number;
  order: number;
}

function feature(ctx: Ctx, template: string): string {
  const text = fragment(ctx.f(template));
  return text.length > MVP_ITEM_MAX ? stripTerminal(clampSentence(text, MVP_ITEM_MAX)) : text;
}

function buildMvp(ctx: Ctx, rng: Rng): string[] {
  const { dna, fusion } = ctx;
  const out: Feature[] = [];
  const push = (text: string, priority: number, order: number) => {
    if (text) out.push({ text, priority, order });
  };

  const mvpA = dna.mechanic.mvp.filter((s) => s.trim());
  const mvpB = fusion ? fusion.mechanic.mvp.filter((s) => s.trim()) : [];
  push(feature(ctx, mvpA[0] ?? ""), 10, 0);
  if (fusion) push(feature(ctx, mvpB[0] ?? ""), 9.5, 1);
  push(feature(ctx, dna.chaos.mvp), 10, 3);
  push(feature(ctx, mvpA[1] ?? ""), 8, 2);
  if (fusion) push(feature(ctx, mvpB[1] ?? ""), 6, 2.5);
  mvpA.slice(2).forEach((m, i) => push(feature(ctx, m), 5 - i, 2.2 + i * 0.1));

  // The constraint becomes a concrete build requirement.
  push(feature(ctx, dna.constraint.implication), 7, 4);

  // A domain API, used for something specific.
  const api = (dna.domain.apis ?? []).find((a) => a.trim());
  if (api) push(feature(ctx, `${api} lookup to pre-fill each {thing}`), 5.5, 5);

  // Each mutation earns one feature; the latest one is the most important.
  ctx.mutations.forEach((kind, i) => {
    const pool = MUTATION_FEATURES[kind];
    if (!pool) return;
    const isLast = i === ctx.mutations.length - 1;
    push(feature(ctx, rng.pick(pool)), isLast ? 9 : 6, 6 + i * 0.1);
  });

  const seen = new Set<string>();
  const unique = out.filter((x) => {
    const key = dedupeKey(x.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const cap = ctx.has("simpler") ? 3 : 5;
  const picked = [...unique]
    .sort((a, b) => b.priority - a.priority || a.order - b.order)
    .slice(0, cap)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.text);

  const fillers = ["Shareable link for every {thing}", "Empty state that explains the rules in one line", "History of past {things}"];
  for (const filler of fillers) {
    if (picked.length >= 3) break;
    const text = feature(ctx, filler);
    if (!picked.some((p) => dedupeKey(p) === dedupeKey(text))) picked.push(text);
  }
  return picked;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Stack                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export const STACK_LAYER_ORDER: readonly StackLayer[] = [
  "FRONTEND",
  "BACKEND",
  "DATA",
  "REALTIME",
  "AI",
  "API",
  "DEVICE",
  "HOSTING",
];

const STACK_MAX = 6;
const FRAMEWORK_RE = /\b(next(\.?js)?|react|vite|svelte(kit)?|vue|nuxt|remix|astro|expo|solid(js)?|angular)\b/i;
const PLATFORM_FRONTEND_RE = /\b(next(\.?js)?|react|vite|svelte|vue|nuxt|remix|astro|expo|angular|html|vanilla|tauri|electron|extension|ink|cli|phaser|pixi)\b/i;

/** Which platform the constraint (or mechanic) dictates. */
export function detectPlatform(dna: Pick<IdeaDNA, "constraint" | "mechanic">): Platform {
  const c = dna.constraint;
  const text = `${c.short} ${c.text} ${c.implication}`.toLowerCase();
  const ct = new Set(c.tags);
  if (ct.has("single-file") || ct.has("no-framework") || /single (html )?file|one html file|no framework|no build step|vanilla js/.test(text)) {
    return "single-file";
  }
  if (ct.has("cli") || /\bcli\b|command[- ]line|terminal only|runs in the terminal/.test(text)) return "cli";
  if (ct.has("browser-extension") || /browser extension/.test(text)) return "browser-extension";
  if (ct.has("desktop-widget") || /desktop widget|menu[- ]bar/.test(text)) return "desktop-widget";
  if (ct.has("bot") || /\bchat ?bot\b|\bbot only\b/.test(text)) return "bot";
  const mt = new Set(dna.mechanic.tags);
  if (mt.has("cli")) return "cli";
  if (mt.has("browser-extension")) return "browser-extension";
  if (mt.has("desktop-widget")) return "desktop-widget";
  if (mt.has("bot")) return "bot";
  return "web";
}

const PLATFORM_DEFAULTS: Record<Platform, { frontend?: StackItem; backend?: StackItem; hosting: StackItem }> = {
  web: {
    frontend: { layer: "FRONTEND", name: "Next.js (App Router)", why: "UI and API routes in one codebase" },
    hosting: { layer: "HOSTING", name: "Vercel", why: "zero-config deploys and preview links" },
  },
  "single-file": {
    frontend: { layer: "FRONTEND", name: "Single HTML file (vanilla JS + CSS)", why: "the constraint rules out a build step" },
    hosting: { layer: "HOSTING", name: "GitHub Pages", why: "any static host works" },
  },
  cli: {
    frontend: { layer: "FRONTEND", name: "Node.js CLI (commander + Ink)", why: "the terminal is the interface" },
    hosting: { layer: "HOSTING", name: "npm registry", why: "install with one command" },
  },
  "browser-extension": {
    frontend: { layer: "FRONTEND", name: "Browser extension (Manifest V3)", why: "lives where the user already is" },
    hosting: { layer: "HOSTING", name: "Chrome Web Store", why: "one-click install" },
  },
  "desktop-widget": {
    frontend: { layer: "FRONTEND", name: "Tauri desktop widget", why: "tiny native window, web UI inside" },
    hosting: { layer: "HOSTING", name: "GitHub Releases", why: "signed builds per platform" },
  },
  bot: {
    backend: { layer: "BACKEND", name: "Chat bot runtime (grammY or discord.js)", why: "the chat is the interface" },
    hosting: { layer: "HOSTING", name: "Fly.io", why: "always-on process for the bot" },
  },
};

const REMOVAL_ALIASES: Record<string, { layers?: StackLayer[]; name?: RegExp }> = {
  auth: { name: /auth|clerk|login|lucia|kinde|oauth|passkey/i },
  "needs-auth": { name: /auth|clerk|login|lucia|kinde|oauth|passkey/i },
  login: { name: /auth|clerk|login|lucia|kinde|oauth|passkey/i },
  accounts: { name: /auth|clerk|login|lucia|kinde|oauth|passkey/i },
  database: { layers: ["DATA"] },
  "needs-database": { layers: ["DATA"] },
  db: { layers: ["DATA"] },
  server: { layers: ["BACKEND"] },
  "needs-server": { layers: ["BACKEND"] },
  backend: { layers: ["BACKEND"] },
  realtime: { layers: ["REALTIME"] },
  ai: { layers: ["AI"] },
  "ai-model": { layers: ["AI"] },
  llm: { layers: ["AI"] },
  framework: { name: FRAMEWORK_RE },
  "no-framework": { name: FRAMEWORK_RE },
  nextjs: { name: /next(\.?js)?/i },
  "next-js": { name: /next(\.?js)?/i },
  react: { name: /react/i },
  payments: { name: /stripe|payment|paddle|lemon ?squeezy/i },
  "needs-network": { layers: ["API"] },
};

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Does a constraint's stackRemove entry knock out this stack item? */
export function stackItemRemoved(item: StackItem, removals: readonly string[]): boolean {
  for (const raw of removals) {
    const r = raw.trim();
    if (!r) continue;
    if (STACK_LAYER_ORDER.includes(r.toUpperCase() as StackLayer) && item.layer === r.toUpperCase()) return true;
    const alias = REMOVAL_ALIASES[r.toLowerCase()];
    if (alias) {
      if (alias.layers?.includes(item.layer)) return true;
      if (alias.name?.test(item.name)) return true;
      continue;
    }
    const s = slug(r);
    if (s.length >= 3 && slug(item.name).includes(s)) return true;
  }
  return false;
}

/** True when the constraint takes the server database away (state must live on the client). */
export function constraintRemovesData(constraint: Constraint): boolean {
  const probe: StackItem = { layer: "DATA", name: "Postgres" };
  if (stackItemRemoved(probe, constraint.stackRemove ?? [])) return true;
  return hasAny(constraint.tags, ["local-first", "no-backend", "no-database", "offline-capable"]);
}

interface Ranked {
  item: StackItem;
  priority: number;
}

function buildStack(ctx: Ctx): StackItem[] {
  const { dna, fusion, platform } = ctx;
  const removals = dna.constraint.stackRemove ?? [];
  const ranked: Ranked[] = [];
  const add = (item: StackItem | undefined, priority: number, removable = true) => {
    if (!item || !item.name?.trim()) return;
    if (removable && stackItemRemoved(item, removals)) return;
    if (platform !== "web" && item.layer === "FRONTEND" && FRAMEWORK_RE.test(item.name)) return;
    ranked.push({ item: { ...item, name: item.name.trim() }, priority });
  };

  // What the constraint demands always survives.
  (dna.constraint.stackAdd ?? []).forEach((item) => add(item, 100, false));
  dna.mechanic.stack.forEach((item, i) => add(item, 80 - i * 3));
  fusion?.mechanic.stack.forEach((item, i) => add(item, 70 - i * 3));

  const api = (dna.domain.apis ?? []).find((a) => a.trim());
  if (api) add({ layer: "API", name: api, why: `real ${ctx.f("{things}")} data` }, 62);

  if (ctx.has("viral")) {
    add(
      platform === "web"
        ? { layer: "BACKEND", name: "OG image route (@vercel/og)", why: "share cards render server-side" }
        : { layer: "FRONTEND", name: "Canvas share-card export", why: "shareable images without a server" },
      66,
    );
  }
  if (ctx.has("technical")) {
    const hasData = ranked.some((r) => r.item.layer === "DATA");
    add(
      !hasData && !constraintRemovesData(dna.constraint)
        ? { layer: "DATA", name: "Postgres + Drizzle ORM", why: "typed schema and real migrations" }
        : { layer: "BACKEND", name: "Inngest background jobs", why: "retryable scheduled work" },
      67,
    );
  }

  // Platform defaults fill whatever layers are still empty.
  const defaults = PLATFORM_DEFAULTS[platform];
  const hasFramework = ranked.some((r) => r.item.layer === "FRONTEND" && PLATFORM_FRONTEND_RE.test(r.item.name));
  if (defaults.frontend && !hasFramework) add(defaults.frontend, 90);
  if (defaults.backend && !ranked.some((r) => r.item.layer === "BACKEND")) add(defaults.backend, 88);
  if (!ranked.some((r) => r.item.layer === "HOSTING")) add(defaults.hosting, 40);

  // De-duplicate by name, keep the highest priority, cap, then order by layer.
  const byName = new Map<string, Ranked>();
  for (const r of ranked) {
    const key = slug(r.item.name);
    const prev = byName.get(key);
    if (!prev || r.priority > prev.priority) byName.set(key, r);
  }
  let items = [...byName.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, STACK_MAX)
    .map((r) => r.item);

  if (ctx.has("cheaper")) items = items.map(cheapen);

  return items.sort((a, b) => STACK_LAYER_ORDER.indexOf(a.layer) - STACK_LAYER_ORDER.indexOf(b.layer));
}

const PAID_AI = /openai|gpt|claude|anthropic|gemini|replicate|elevenlabs|midjourney|stability/i;

/** CHEAPER: swap paid services for free tiers or on-device equivalents. */
function cheapen(item: StackItem): StackItem {
  if (item.layer === "AI" && PAID_AI.test(item.name)) {
    return { layer: "AI", name: "Transformers.js (on-device model)", why: "zero per-request cost" };
  }
  if (item.layer === "HOSTING" && /vercel/i.test(item.name)) {
    return { layer: "HOSTING", name: "Vercel (Hobby tier)", why: "free for a personal project" };
  }
  if (item.layer === "DATA" || item.layer === "REALTIME" || item.layer === "BACKEND") {
    return { ...item, why: "free tier covers the MVP" };
  }
  return item;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Effort                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const MUTATION_EFFORT: Record<MutationKind, number> = {
  useful: -0.25,
  viral: 0.25,
  weird: 0.25,
  technical: 1,
  social: 0.5,
  simpler: -1.5,
  harder: 1.5,
  cheaper: -0.5,
  chaotic: 0.5,
};

export interface EffortRating {
  difficulty: Difficulty;
  estimate: Estimate;
  /** Raw effort points (≈ 0–9). */
  points: number;
}

function rateEffort(ctx: Ctx): EffortRating {
  const { dna, fusion } = ctx;
  let p = clamp(dna.mechanic.complexity, 1, 5) + clamp(dna.constraint.effort, -2, 3);
  if (fusion) p += 1 + Math.max(0, fusion.mechanic.complexity - dna.mechanic.complexity) * 0.5;
  if (ctx.chaos >= 80) p += 1;
  else if (ctx.chaos >= 60) p += 0.5;
  if (dna.chaos.weirdness >= 85) p += 0.5;
  const mt = dna.mechanic.tags;
  if (mt.includes("heavy-compute")) p += 0.5;
  if (mt.includes("payments")) p += 0.5;
  if (mt.includes("realtime") && mt.includes("needs-server")) p += 0.25;
  for (const m of ctx.mutations) p += MUTATION_EFFORT[m] ?? 0;
  p = Math.max(0, p);

  let difficulty: Difficulty;
  if (p <= 2) difficulty = "EASY";
  else if (p <= 3.5) difficulty = "MEDIUM";
  else if (ctx.chaos >= 80 && p >= 5.5) difficulty = "UNHINGED";
  else difficulty = "HARD";

  let tier = p <= 1.5 ? 0 : p <= 3 ? 1 : p <= 4.5 ? 2 : 3;
  if (ctx.has("simpler")) tier -= 1;
  const cap = dna.constraint.estimateCap ? ESTIMATES.indexOf(dna.constraint.estimateCap) : -1;
  if (cap >= 0) tier = Math.min(tier, cap);
  tier = clamp(tier, 0, ESTIMATES.length - 1);
  return { difficulty, estimate: ESTIMATES[tier], points: Math.round(p * 100) / 100 };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Viral potential (explicitly vibes-based)                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function viralLabel(score: number): string {
  if (score < 25) return "LOW SIGNAL";
  if (score < 50) return "GROUP CHAT";
  if (score < 70) return "SCREENSHOT BAIT";
  if (score < 85) return "MAIN CHARACTER";
  return "ALGORITHM BAIT";
}

const SHARE_TAGS = ["ugc", "visual", "generator", "social-graph", "multiplayer", "competitive", "video", "strangers", "async-social", "anonymous", "shareable", "game"];

function rateViral(ctx: Ctx): ViralPotential {
  const { dna, fusion } = ctx;
  const tags = ctx.tags;
  const reasons: { text: string; weight: number }[] = [];
  const reason = (text: string, weight: number) => reasons.push({ text, weight });

  let score = clamp(dna.chaos.viral, 0, 100) * 0.5;
  if (dna.chaos.viral >= 60) reason("The rule itself is a story people retell", dna.chaos.viral / 10);

  const shareHits = SHARE_TAGS.filter((t) => tags.has(t)).length;
  score += Math.min(25, shareHits * 5);
  if (hasAny(tags, ["visual", "generator", "video"])) reason("Every result is screenshot-shaped", 6);
  if (tags.has("ugc")) reason("Users make the content, so the feed fills itself", 5.5);
  if (hasAny(tags, ["multiplayer", "social-graph", "async-social"])) reason("It needs friends to work, so it recruits them", 5);
  if (tags.has("competitive")) reason("A leaderboard turns quiet users into loud ones", 4.5);
  if (hasAny(tags, ["anonymous", "strangers"])) reason("Anonymity makes people braver than they should be", 4);

  score += Math.min(12, Math.max(0, dna.trend.score) * 0.12);
  if (dna.trend.score >= 60) reason(`Rides “${dna.trend.title}” while people are still talking about it`, dna.trend.score / 12);

  if (dna.constraint.tags.includes("shareable")) {
    score += 8;
    reason(`${capitalize(stripTerminal(dna.constraint.text))} forces a shareable output`, 5);
  }
  score += (ctx.chaos / 100) * 8;
  if (fusion) score += 5;
  for (const m of ctx.mutations) {
    if (m === "viral") score += 12;
    else if (m === "social") score += 6;
    else if (m === "weird" || m === "chaotic") score += 4;
    else if (m === "useful") score -= 4;
  }
  if (ctx.has("viral")) reason("Built-in share cards do the marketing", 7);

  const final = Math.round(clamp(score, 3, 99));
  if (reasons.length === 0) {
    reason(final < 25 ? "Useful rather than loud; growth is word of mouth" : "Odd enough to get a second look", 1);
  }
  return {
    score: final,
    label: viralLabel(final),
    reasons: reasons
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((r) => r.text),
  };
}
