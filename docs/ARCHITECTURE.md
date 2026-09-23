# SPIN//BUILD — Architecture & Build Contract

> "Spin the internet into something worth building."

A futuristic idea roulette. `TOPIC × USER × MECHANIC × TREND × CHAOS × CONSTRAINT = NEW IDEA`.
Black-and-white, Swiss/editorial, sci-fi lab instrument. **Not** a casino, **not** a SaaS dashboard.

Read this whole file plus `types/index.ts` before writing code. Next.js here is **16.3** (App Router,
Turbopack, React 19.2, Tailwind v4, Zod 4, Zustand 5, Motion 12). APIs differ from older versions —
check `node_modules/next/dist/docs/` for anything framework-specific (params are Promises, etc.).

---

## 0. Product principles (non-negotiable)

1. **Spin immediately.** No onboarding, no modal, no loading wall. The first spin must work before any
   network request finishes. Trend APIs are enhancements, never dependencies.
2. **Idea quality > everything but the wheel.** Humor comes from combinations, not joke text. Every idea
   needs at least one distinctive hook. Generic ideas ("AI todo app", "weather app", "chat app",
   "habit tracker") are detected and auto-mutated once.
3. **Deterministic core.** All generation goes through a seeded RNG. Same recipe ⇒ same idea. Daily
   Spin is identical for everyone on the same UTC date. `Math.random()` is banned in `lib/random`,
   `lib/generator`, and `data` (animation jitter in UI is fine).
4. **Fast + restrained motion.** 60fps wheel, no decorative animation, full `prefers-reduced-motion`
   support, nothing critical gated behind animation.

---

## 1. Directory map & ownership

```
app/
  layout.tsx                 fonts, metadata, <AppShell>          (lead — done)
  globals.css                design tokens                        (lead — done)
  page.tsx                   LAB (home)                           (ui-lab)
  trends/page.tsx            TREND PULSE                          (ui-pages)
  saved/page.tsx             SAVED + HISTORY tabs                 (ui-pages)
  history/page.tsx           → HISTORY view                       (ui-pages)
  about/page.tsx             ABOUT                                (ui-pages)
  daily/page.tsx             DAILY SPIN                           (ui-pages)
  fuse/page.tsx              FUSE mode                            (ui-pages)
  idea/[code]/page.tsx       shared idea                          (ui-pages)
  api/trends/route.ts        trend aggregation endpoint           (trends)
  api/spark/route.ts         safe joke → chaos inspiration        (trends)
components/
  shell/                     AppShell, SiteHeader, ChaosSlider, CommandPalette, hotkeys, toasts (ui-shell)
  roulette/                  RouletteWheel, physics, audio         (roulette)
  lab/                       SpinLab orchestrator, hero, metadata, reveal, bottom sheet (ui-lab)
  idea/                      IdeaResult, DnaPanel, LockButton, ConceptView, ActionBar, MutateMenu,
                             ViralMeter, BuildBrief, ShareDialog, share-card canvas   (ui-idea)
  trends/                    TrendCard, TrendTicker, TrendPulse    (ui-pages)
  fuse/                      FuseStage (merge animation)          (ui-pages)
  ui/                        tiny primitives: Button, Kbd, ScrambleText, VisuallyHidden (ui-shell)
lib/
  random/                    seeded RNG + helpers                  (engine-core)
  generator/                 roll, codec, daily, index (engine-core); synthesize, templates, boring,
                             mutate, fuse, brief, text (engine-synth)
  trends/                    providers, engine, scoring, lexicon, cache, client (trends)
  storage/                   StorageAdapter + localStorage impl    (store)
  store/                     zustand store `useSpin`               (store)
  hooks/                     useReducedMotion, useMediaQuery, useHydrated (store)
data/                        datasets (data-*) — index.ts, sectors.ts, data.test.ts by lead
types/index.ts               THE contract (lead)
scripts/sample-ideas.ts      prints sample ideas for quality review (engine-synth)
```

**Only edit files you own.** If you need a change in a file you don't own, note it in your final report
(the lead integrates). You may add new files inside your own directories.

---

## 2. Datasets (`data/`)

Each dataset file exports a typed array (see stubs). Minimums: 30 domains (grouped under the 18 wheel
sectors — ~2 per sector), 40 targets, 40 mechanics, 100 chaos modifiers (split `chaos-mild.ts`
weirdness ≈ 0–55 and `chaos-wild.ts` ≈ 45–100), 60 constraints, 50 fallback trends (≥ 38 GLOBAL,
≥ 12 VN), 30 lexicon entries. `npx vitest run data` must pass.

### 2.1 Composition grammar (write fragments that fit these frames)

The synthesizer glues fragments from different datasets. **Test every fragment mentally against three
random partners.** Placeholders allowed in template fields: `{users} {user} {activity} {thing}
{things} {product} {trend}` — nothing else.

| Frame | Example |
|---|---|
| Pitch: `A {mechanic.adjective} {domain.product} for {target.plural} {chaos.clause}.` | "A **multiplayer** **study room** for **university students** **where an AI boss gets increasingly annoyed when nobody is studying**." |
| Trend line: `It {trend.angle}.` | "It **lets a personal AI agent do the nagging for you**." |
| Mechanic line: `It {mechanic.verb} — {mechanic.hook}.` | "It **puts everyone in one live room** — **progress is visible to everyone in real time**." |
| Chaos rule: `{chaos.text}` | "The app gets increasingly angry at the user." |
| Constraint: `{constraint.text} {constraint.implication}` | "No login. Rooms are anonymous and joined via 4-letter codes." |
| Loop step (imperative): `{mechanic.loop[i]}` / `{chaos.twist}` | "Join a live room with other {users}." |
| Problem: `{domain.problems[i]}` | "{users} lose whole evenings to 'five more minutes' of scrolling." |
| Name: 1–3 words from `nameWords` pools | "PROCRASTINATION BOSS", "GHOST MENU", "RATE MY DORM" |

Field rules:
- `domain.product`: lowercase countable noun phrase that works after "a/an {adjective}": "study room",
  "recipe box", "outfit planner", "group-trip itinerary". Never "app" alone.
- `domain.activity`: lowercase gerund phrase: "studying", "splitting bills", "planning trips".
- `mechanic.adjective`: lowercase pre-noun modifier that reads well before *any* product:
  "multiplayer", "camera-first", "voice-only", "swipe-based", "map-based", "timer-driven",
  "QR-powered", "in-browser". (Proper nouns like QR/AI/NFC may keep capitals.)
- `chaos.clause`: begins with a connective (where/that/but/and/which/until/so/while/because/unless) and
  completes the pitch sentence. Lowercase first letter, no trailing period.
- `trend.angle` / lexicon `angle`: 3rd-person verb phrase, no trailing period.
- `short`: UPPERCASE ≤ 18 chars (DNA readout). `nameWords`: UPPERCASE single words.
- Sentences in `problems`, `pains`, `twist`, `hook`, `implication`, `text` — plain, concrete, witty
  by *specificity*, never by "lol random". No emoji. No exclamation spam.

### 2.2 Tag vocabulary (shared across all datasets — use these spellings)

- device: `camera` `microphone` `location` `motion-sensors` `bluetooth` `nfc` `haptics` `notifications`
- platform: `web` `mobile` `desktop` `browser-extension` `desktop-widget` `pwa` `wearable` `cli` `bot` `email` `sms`
- infra: `realtime` `needs-server` `needs-database` `needs-auth` `ai-model` `payments` `offline-capable`
  `needs-network` `background-task` `heavy-compute`
- social: `multiplayer` `social-graph` `strangers` `async-social` `ugc` `anonymous` `competitive`
- format: `visual` `audio` `text-heavy` `video` `maps` `game` `generator` `marketplace` `timer`
- safety: `minors` (target includes under-18s) · `adult-only` (romance, alcohol, money risk, strangers
  meeting IRL) — `adult-only` must never meet `minors`
- quality: `commodity` = generic on its own (todo list, weather, chat, habit tracker, notes, calculator,
  generic "AI assistant"). The boringness detector keys off this.

`conflicts` lists ids **or** tags of other genes this entry must never combine with, e.g. a constraint
"Must work offline" → `conflicts: ["realtime", "needs-server"]`; "Mobile only" →
`["browser-extension", "desktop-widget", "cli"]`; a dating domain → `["minors"]`. The roller treats
conflicts symmetrically across all six genes.

### 2.3 Content safety

No real-money gambling (fictional currency / prediction games are fine), no stalkerware or covert
surveillance of partners/employees, no targeting or mocking protected groups, no self-harm, no sexual
content, no minors in romance/stranger-meeting contexts, no medical/financial *advice* claims. Weird is
good; cruel is not. "Brutally honest feedback" is aimed at the user's work/habits, never identity.

---

## 3. Random engine (`lib/random/`, engine-core)

```ts
export interface Rng {
  readonly seed: string;
  next(): number;                       // [0, 1)
  int(min: number, max: number): number; // inclusive
  float(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T, i: number) => number): T;
  shuffle<T>(items: readonly T[]): T[];
  sample<T>(items: readonly T[], n: number): T[];
  fork(label: string): Rng;             // independent deterministic sub-stream
}
export function createRng(seed: string | number): Rng;     // xmur3/cyrb53 hash → sfc32/mulberry32
export function randomSeed(): string;                       // crypto.getRandomValues → base36, 7 chars. ONLY non-deterministic source.
export function hashString(input: string): number;          // 32-bit unsigned
export function chaosAffinity(weirdness: number, chaos: number): number; // bell curve in (0,1]; never 0
export function dailySeed(date: Date | string): string;     // "daily-2026-09-23" (UTC date)
export function dailyNumber(date: Date | string): number;   // days since 2026-01-01 UTC, 1-based
export function ideaNumber(seed: string): string;           // "08421" (5 digits)
export function utcDateKey(date: Date | string): string;    // "2026-09-23"
```

Weighted selection must support: base `weight`, chaos affinity, trend score, category exclusion,
recent-result avoidance (penalty, not hard ban), locked attributes, conflict filtering.

---

## 4. Generator (`lib/generator/`)

### 4.1 Public API — `lib/generator/index.ts` (engine-core owns; re-exports synth modules)

```ts
export interface SpinOptions {
  chaos: number;                 // 0–100
  region: Region;
  seed?: string;                 // default randomSeed()
  kind?: IdeaKind;               // "cursed" forces chaos = 100
  locked?: Partial<IdeaDNA>;     // gene values to keep verbatim
  injectedTrend?: Trend | null;  // forces the trend gene
  trendPool?: Trend[];           // scored live+curated trends; default = curated for region
  recent?: string[];             // recent comboKeys to avoid
  excludeSectors?: SectorId[];
  chaosBias?: string[];          // tags that bias chaos-modifier choice (from /api/spark)
}
export function spinIdea(opts: SpinOptions): Idea;
export function rerollIdea(prev: Idea, locks: readonly DnaKey[], opts: Omit<SpinOptions, "locked">): Idea;
export function mutateIdea(prev: Idea, kind: MutationKind): Idea;
export function fuseIdeas(a: Idea, b: Idea, seed?: string): Idea;
export function dailyIdea(date?: Date | string): Idea;       // deterministic, curated GLOBAL trends only
export function ideaFromRecipe(recipe: IdeaRecipe): Idea | null;
export function ideaFromCode(code: string): Idea | null;
export function encodeRecipe(recipe: IdeaRecipe): string;    // URL-safe, versioned, round-trips
export function decodeRecipe(code: string): IdeaRecipe | null; // zod-validated, never throws
export function comboKey(dna: IdeaDNA): string;
export { synthesizeConcept } from "./synthesize";
export { scoreBoringness, BORING_THRESHOLD } from "./boring";
export { buildBrief, briefToPrompt, ideaToText, ideaShareText } from "./brief";
```

`spinIdea` flow: seed → rng → roll genes (locked kept; injected trend forced; weighted by chaos
affinity × weight × trend score × recency penalty; conflicts filtered; domain picked so each *sector*
is equally likely) → recipe → `ideaFromRecipe` → `scoreBoringness` → if ≥ `BORING_THRESHOLD`,
`planMutation(recipe, antiBoringMutation(...), rng.fork("anti-boring"))` once with `auto: true` →
return. If the comboKey is in `recent`, re-roll unlocked genes (max 6 attempts).
`ideaFromRecipe` is pure given the recipe (only `createdAt` varies) — it never runs the boringness
auto-mutation (that already happened and is recorded in `recipe.mutations` / `recipe.auto`).

### 4.2 Synthesis modules (engine-synth owns)

```ts
// synthesize.ts
export interface SynthesisInput { dna: IdeaDNA; seed: string; chaos: number; mutations: readonly MutationKind[]; fusion?: FusionExtras }
export function synthesizeConcept(input: SynthesisInput): Concept;   // pure + deterministic
// boring.ts
export interface BoringReport { score: number; reasons: string[]; generic: boolean }
export const BORING_THRESHOLD: number;
export function scoreBoringness(dna: IdeaDNA, concept: Concept): BoringReport;
export function antiBoringMutation(dna: IdeaDNA, report: BoringReport): MutationKind;
// mutate.ts — may swap 1–2 unlocked-feeling genes, shift chaos, append mutation; preserves the core
export function planMutation(recipe: IdeaRecipe, kind: MutationKind, rng: Rng): IdeaRecipe;
// fuse.ts — kind "fuse"; A's domain/target/trend + B's domain & mechanic as `fusion`
export function planFusion(a: Idea, b: Idea, rng: Rng): IdeaRecipe;
// brief.ts
export function buildBrief(idea: Idea): BuildBrief;
export function briefToPrompt(idea: Idea, brief?: BuildBrief): string; // paste-ready coding-agent prompt
export function ideaToText(idea: Idea): string;                         // COPY IDEA
export function ideaShareText(idea: Idea, url: string): string;         // short social text
// text.ts — fill(template, dna), article(a/an), capitalize, list joins, trendAngle(trend)
```

Chaos level must visibly change: modifier/constraint/mechanic/target selection (via weirdness), name
templates, pitch/why copywriting tone, and difficulty. At 100 ideas may be absurd but must remain
technically possible.

Estimates: `3 HOURS | 1 DAY | WEEKEND | 1 WEEK`. Difficulty: `EASY | MEDIUM | HARD | UNHINGED`
(UNHINGED reserved for high chaos + high complexity). Viral potential is explicitly vibes-based —
label it that way in the UI.

---

## 5. Trend engine (`lib/trends/`, `app/api/*`, trends owner)

- Provider adapters implement `TrendProvider` (types/index.ts): `gif` (GIPHY trending searches,
  `GIPHY_API_KEY`), `tech` (Hacker News via Algolia front page, keyless), `video` (YouTube Data API
  mostPopular, `YOUTUBE_API_KEY`, supports VN), `search` (Google Trends daily RSS, keyless, supports
  VN via `geo=VN`; GLOBAL uses `geo=US` and says so), `community` (Reddit app-only OAuth when
  `REDDIT_CLIENT_ID/SECRET` exist, otherwise disabled; plus a keyless Lobsters/dev.to fallback is
  acceptable), `curated` (local `FALLBACK_TRENDS`).
- All external payloads are validated with **Zod**; invalid items are dropped, never thrown.
- `engine.ts`: `getTrendSnapshot(region, { force? }): Promise<TrendSnapshot>` — never throws. In-memory
  cache per region (fresh 10 min, stale-while-revalidate up to 60 min), per-provider timeout ≤ 3.5 s,
  `Promise.allSettled`, circuit breaker (failure ⇒ disabled 2→30 min exponential). Cross-source
  merge by normalized title tokens. Always returns ≥ 24 trends (padded with curated). Status:
  `ONLINE` (≥ 2 live providers ok), `PARTIAL` (1), `OFFLINE_CACHE` (0 live → curated only).
- `scoring.ts`: weighted model — recency, source popularity signal (rank within source × provider
  weight), cross-source occurrence, novelty, relevance to app creation (lexicon). Internal weighting
  only; UI must not claim objective popularity.
- `lexicon.ts`: classify arbitrary live titles into `category`, `tags`, `relevance`, `angle`,
  `nameWords` using `TREND_LEXICON`; unsafe titles (violence, tragedies, politics, adult) are
  filtered out of the roulette pool.
- `GET /api/trends?region=GLOBAL|VN` → `TrendSnapshot`. `Cache-Control: public, s-maxage=600,
  stale-while-revalidate=3600`. Secrets stay server-side. `GET /api/spark` → safe joke (JokeAPI
  safe-mode + blacklist flags) reduced to `{ text, tags }` used only to *bias* chaos-modifier
  selection — never turned into the idea itself.
- `client.ts` (browser-safe, no provider imports): `fetchTrendSnapshot(region, { signal, timeoutMs })`
  → `TrendSnapshot | null`; `fallbackSnapshot(region)` → curated snapshot (pure, instant);
  `fetchSpark()` → `{ text, tags } | null`.

---

## 6. Persistence + state (`lib/storage/`, `lib/store/`, `lib/hooks/`, store owner)

```ts
// lib/storage/adapter.ts — async so a cloud adapter can drop in later
export interface StorageAdapter {
  getHistory(): Promise<HistoryEntry[]>;               // newest first
  putHistory(entry: HistoryEntry): Promise<void>;      // upsert by id
  updateHistory(id: string, patch: Partial<HistoryEntry>): Promise<void>;
  removeHistory(id: string): Promise<void>;
  clearHistory(opts?: { keepSaved?: boolean }): Promise<void>;
  getSettings(): Promise<Settings | null>;
  putSettings(settings: Settings): Promise<void>;
  getRecentCombos(): Promise<string[]>;                // capped 50
  pushRecentCombo(key: string): Promise<void>;
}
export function getStorage(): StorageAdapter;          // localStorage (versioned keys) or memory fallback
```

```ts
// lib/store/spin-store.ts — `export const useSpin = create<SpinStore>()(...)`
type Phase = "idle" | "spinning" | "revealing" | "result";
interface SpinStore {
  // state
  phase: Phase;
  spinId: number;            // increments per wheel spin (wheel animates on change)
  revealId: number;          // increments whenever a new idea is shown without a wheel spin (reroll/mutate)
  targetSector: SectorId | null;
  current: Idea | null;      // idea being revealed or shown
  previous: Idea | null;     // for undo / fuse
  locks: DnaKey[];
  injectedTrend: Trend | null;
  chaos: number; region: Region; audio: boolean;
  trends: TrendSnapshot;     // starts as fallbackSnapshot("GLOBAL"), then live
  trendSync: "idle" | "syncing" | "ready" | "failed";
  spark: { text: string; tags: string[] } | null;
  history: HistoryEntry[];
  hydrated: boolean;
  // actions
  hydrate(): Promise<void>;                  // load settings/history/recent; kick off trend sync + spark
  spin(opts?: { cursed?: boolean; chaos?: number; seed?: string }): void; // computes idea FIRST, then phase "spinning"
  settle(): void;                            // wheel stopped → "revealing"
  finishReveal(): void;                      // → "result"; records history + recent combo
  skipToResult(): void;                      // reduced motion / impatient users
  reroll(): void;                            // keeps locked genes, instant, revealId++
  mutate(kind: MutationKind): void;
  toggleLock(key: DnaKey): void;
  clearLocks(): void;
  injectTrend(trend: Trend | null): void;    // forces trend on next spin, auto-locks "trend"
  setChaos(n: number): void; setRegion(r: Region): void; setAudio(on: boolean): void;
  refreshTrends(): Promise<void>;
  loadIdea(idea: Idea, opts?: { record?: boolean }): void; // show an idea directly as "result"
  backToWheel(): void;                       // phase "idle" (keeps current for locks)
  toggleSave(id?: string): void;             // saves current if no id; adds to history if missing
  removeHistory(id: string): void; clearHistory(): void;
}
```
The store is the only place UI calls the generator for the lab. Pages like FUSE/DAILY may call the
generator directly and then `loadIdea()`. Locks apply to the *current* idea's genes. SPACE while
spinning is ignored; during "revealing" it skips to result.

Hooks: `useReducedMotion()`, `useMediaQuery(q)`, `useHydrated()`.

---

## 7. Roulette (`components/roulette/`, roulette owner)

```tsx
<RouletteWheel
  sectors={SECTORS}
  spinId={spinId}                 // change ⇒ spin
  targetIndex={idx}               // 0-based sector to land on (decided BEFORE the animation)
  onSettle={(i) => …}             // exactly once per spinId
  onTick={(i) => …}               // sector under the selector changed
  onSpinRequest={({ velocity }) => …} // hub click or flick/drag gesture; velocity in deg/s (optional)
  activeIndex={resultIdx | null}  // resting highlight
  audio reducedMotion disabled
/>
```
- Result is decided by the engine first; the wheel animates *to* it (flick velocity shapes the
  motion, deceleration is solved so it lands inside the target sector with a small natural offset).
- Sequence: fast acceleration → multiple rotations → long deceleration → sectors tick past the
  selector (ticks + live inverted highlight of the sector under the selector) → precise stop with a
  tiny mechanical detent settle.
- 60fps: rAF + direct DOM transforms via refs; no React state per frame. Highlight updates only when
  the index changes.
- Mechanical tick audio synthesized with WebAudio (no files), off unless `audio`.
- Reduced motion: no spin — snap to target with a 150 ms cross-fade, still call `onSettle`.
- Visual: precision instrument — graduated outer bezel (fine degree ticks, longer ticks at sector
  boundaries, mono numerals 01–18), 18 wedges with hairline dividers, radial uppercase labels, the
  sector under the selector rendered inverted (solid fg with bg text), fixed selector at 12 o'clock,
  large circular hub button "SPIN" (fg fill, bg text). Grayscale only. Scales to any square container.

---

## 8. UI system (all UI owners)

- Tokens only: `bg-bg text-fg text-muted text-subtle border-line border-line-strong bg-surface
  bg-surface-2`. Never `bg-black`/`text-white` (breaks the inversion flash `html[data-invert]`).
- Type: `font-sans` (Geist, grotesk) for UI/display; `font-mono` + `.label` utility for metadata,
  numbers, trend info, system messages. `.display` for huge uppercase headlines.
- Swiss grid: 12 columns, generous negative space, hairline (1px `border-line`) rules, square corners
  (no rounded cards, except circular wheel/hub/toggles). No gradients, no glassmorphism, no
  illustrations, no emoji in UI chrome (lock is an SVG icon).
- Motion: `motion/react` for layout/enter/exit; custom rAF for the wheel; `ScrambleText` for text
  decoding. Durations 120–450 ms, `--ease-out`. Respect reduced motion everywhere.
- Accessibility: semantic landmarks, real `<button>`s, visible focus, `aria-live` announcements for
  results, keyboard shortcuts documented in the command palette (SPACE spin, R reroll, M mutate,
  1–6 toggle locks, S save, B build, ⌘/Ctrl+K palette, Esc close).
- Mobile: wheel stays large and tactile; result DNA lives in a bottom sheet (swipe up to expand),
  44px touch targets.

---

## 9. Conventions

- TypeScript strict, no `any`, no non-null assertions on external data. Named exports.
- `"use client"` only for interactive components; server components elsewhere.
- Server-only modules (`lib/trends/providers/*`, `engine.ts`) start with `import "server-only";`.
- Never expose API keys to the browser. Env vars documented in `.env.example`.
- Tests: vitest (`*.test.ts`, node env). Pure logic (rng, codec, physics, scoring, synthesis
  determinism) must have tests.
- Checks: `npx tsc --noEmit`, `npx vitest run <your dir>`. Do **not** run `next build` / `next dev`
  in parallel phases (the lead runs integration builds).
