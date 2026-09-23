# SPIN//BUILD — UI Build Spec

Companion to `docs/ARCHITECTURE.md` (read that first, especially §7 roulette and §8 UI system).
This file defines screens, layouts, interactions and the component contracts between UI owners.

**The bar:** somebody should want to screenshot this. Futuristic OS × experimental design studio ×
hacker tool. Swiss grid, huge uppercase grotesk, mono metadata, hairlines, negative space. Black-first,
grayscale only. Restrained, precise motion. It must feel instant.

---

## 0. Already built — use these, don't re-implement

| Module | What |
|---|---|
| `@/components/ui` | `Button` (variants solid/outline/ghost, sizes sm/md/lg, `kbd`, `icon`, `pressed`), `Kbd`, `ScrambleText` (decode effect; `trigger` replays), `VisuallyHidden`, `Dialog` (native `<dialog>`, `size="center"|"full"`, `actions`), icons (`LockIcon locked`, `ArrowRightIcon`, `ArrowUpRightIcon`, `CloseIcon`, `SoundIcon on`, `DiceIcon`, `MutateIcon`, `ShareIcon`, `BookmarkIcon filled`, `BoltIcon`, `CopyIcon`, `DownloadIcon`, `RefreshIcon`) |
| `@/lib/ui/cn` | `cn(...classes)` |
| `@/lib/ui/toast` | `toast(message, { detail?, action?: { label, href?, onAction? }, ttlMs? })`, `useToasts` |
| `@/lib/ui/clipboard` | `copyText(text): Promise<boolean>` |
| `@/lib/ui/invert` | `flashInvert(ms = 160)` — black↔white flash via `html[data-invert]` |
| `@/lib/ui/hotkeys` | `useHotkeys({ space, r, "1", escape, "mod+k", "shift+s" … }, enabled)`, `isTypingTarget`, `isActivatableTarget` |
| `@/lib/ui/dialogs` | `useOverlay` — `{ open: "brief"|"share"|"mutate"|"palette"|null, show, hide, toggle }` |
| `@/lib/ui/format` | `timeAgo`, `dnaLine(idea)`, `pad2`, `absoluteUrl(path)`, `ideaPath(idea)` |
| `@/lib/ui/motion` | `prefersReducedMotion()` (non-React) |
| `@/lib/hooks` | `useReducedMotion()`, `useMediaQuery(q)`, `useHydrated()` |
| `@/lib/store` | `useSpin` (zustand) — see ARCHITECTURE §6 for state/actions |
| `@/lib/generator` | `spinIdea`, `rerollIdea`, `mutateIdea`, `fuseIdeas`, `dailyIdea`, `ideaFromCode`, `encodeRecipe`, `buildBrief`, `briefToPrompt`, `ideaToText`, `ideaShareText`, … |
| `@/lib/random` | `dailyNumber`, `utcDateKey`, … |
| `@/components/roulette` | `RouletteWheel` (+ physics/audio) |
| `@/data` | `SECTORS`, `SECTOR_BY_ID`, `sectorPosition`, `POOL_ATOMS`, `POOL_COMBINATIONS`, datasets |
| `@/types` | everything, incl. `CHAOS_BANDS`, `chaosBand()`, `DNA_KEYS`, `DNA_LABEL`, `MUTATIONS`, `REGION_LABEL`, `TREND_SOURCE_LABEL` |

Motion library: `import { motion, AnimatePresence, LayoutGroup } from "motion/react"`.
Styling: Tailwind v4 utilities with the tokens in `app/globals.css` (`bg-bg text-fg text-muted
text-subtle border-line border-line-strong bg-surface bg-surface-2`, `.label`, `.display`,
`.tabular`, `.no-scrollbar`). **Never** `bg-black`/`text-white`/hex colors in components.

---

## 1. Component contracts between UI owners

Each owner replaces the stub files for their exports (stubs already exist with these exact props).

### ui-shell → everyone
```tsx
// components/shell/AppShell.tsx (used by app/layout.tsx)
export function AppShell({ children }: { children: ReactNode }): JSX.Element
// components/shell/controls.tsx — all connected to useSpin
export function ChaosSlider(props: { className?: string; compact?: boolean }): JSX.Element  // SANE ──●── UNHINGED + band
export function RegionToggle(props: { className?: string }): JSX.Element                    // GLOBAL | VIETNAM
export function AudioToggle(props: { className?: string }): JSX.Element                     // AUDIO: ON/OFF
export function TrendEngineStatus(props: { className?: string }): JSX.Element               // "TREND ENGINE: ONLINE" (SYNCING / PARTIAL / OFFLINE CACHE)
```

### ui-idea → ui-lab, ui-pages
```tsx
// components/idea/IdeaResult.tsx
export interface IdeaResultProps {
  idea: Idea;
  /** "lab": connected to useSpin (locks, reroll, mutate, save) + keyboard hints.
   *  "view": read-only (shared / daily / fuse result): OPEN IN LAB, SAVE, SHARE, BUILD THIS. */
  mode: "lab" | "view";
  /** Replays decode animations when it changes (pass useSpin revealId in lab). */
  revealKey?: string | number;
  onOpenInLab?: () => void;   // view mode
  className?: string;
  /** Optional header label override, e.g. "DAILY // 0266" instead of "IDEA GENERATED // #08421". */
  eyebrow?: string;
}
export function IdeaResult(props: IdeaResultProps): JSX.Element
// components/idea/IdeaCard.tsx — compact row/card for lists (history, saved, fuse parents)
export function IdeaCard(props: { idea: Idea; meta?: ReactNode; actions?: ReactNode; className?: string; compact?: boolean }): JSX.Element
// components/idea/BuildBriefDialog.tsx
export function BuildBriefDialog(props: { idea: Idea | null; open: boolean; onClose: () => void }): JSX.Element
// components/idea/ShareDialog.tsx
export function ShareDialog(props: { idea: Idea | null; open: boolean; onClose: () => void; eyebrow?: string; sharePath?: string }): JSX.Element
// components/idea/share-card.ts — canvas renderer
export async function renderShareCard(idea: Idea, opts?: { eyebrow?: string; host?: string }): Promise<HTMLCanvasElement> // 1080×1350
export async function shareCardBlob(idea: Idea, opts?: …): Promise<Blob | null>
```

### ui-lab → (nobody; it is the home page) — uses everything above.

---

## 2. Global shell (ui-shell)

**Header** (56px, hairline bottom, full width, sticky, `bg-bg`):
- Left: wordmark `SPIN//BUILD` — grotesk semibold 15px, tracking −0.02em, the `//` in `text-muted`;
  links to `/`.
- Nav (desktop): `TREND PULSE` `/trends` · `SAVED` `/saved` · `ABOUT` `/about` — 11–12px uppercase,
  tracking 0.08em, muted → fg on hover, active = fg + 1px underline offset 6px. Secondary (smaller,
  muted): `DAILY` `/daily`, `FUSE` `/fuse`.
- Right: `CHAOS: 42%` (mono label, tabular; button opening a small popover with `<ChaosSlider/>`),
  a `⌘K` button (Kbd style; shows "CTRL K" on non-Mac) that opens the command palette.
- Mobile (< 768): wordmark + `CHAOS 42%` + `MENU` button → full-height sheet with nav links (large
  display type), region/audio toggles.

**Command palette** (`useOverlay` "palette"; ⌘/Ctrl+K anywhere, also header button):
- Centered panel `w-[min(560px,100vw-32px)]` at ~18vh, hairline border, `bg-bg`. Input is mono with
  a `>` prompt, placeholder "type a command or /cursed". List: command label (grotesk uppercase),
  description (muted small), right-aligned Kbd hint. ↑/↓/Enter/Esc, mouse hover selects. Fuzzy
  filter (substring on label/keywords). Footer: shortcut legend (SPACE spin · R reroll · M mutate
  · 1–6 locks · S save · B build · ⌘K).
- Commands: `SPIN`, `MAX CHAOS` (setChaos 100), `DAILY SPIN` (/daily), `TREND INJECTION` (opens a
  sub-list of the top 8 trends from `useSpin().trends` → `injectTrend(t)` + toast "INJECTED // AI
  AGENTS" detail "LOCKED INTO YOUR NEXT SPIN"), `FUSE TWO IDEAS` (/fuse), `RANDOMIZE EVERYTHING`
  (clearLocks, random chaos 0–100 (Math.random ok here), spin), `CLEAR LOCKS`, `VIEW HISTORY`
  (/history), and the special `/CURSED` (spin with `{ cursed: true }`; shows as "/CURSED — 100% chaos
  spin. No refunds."). Also: `REROLL`, `MUTATE…` (opens mutate overlay), `BUILD THIS`, `SHARE`,
  `SAVE`, `REGION: VIETNAM/GLOBAL`, `AUDIO ON/OFF`, `GO: TREND PULSE / SAVED / ABOUT`. Typing
  `/cursed` + Enter always runs the cursed spin.
- Spinning commands when NOT on `/`: `router.push("/?cmd=spin" | "/?cmd=cursed" | "/?cmd=randomize")`
  — the lab consumes `cmd` on mount (see §3) and then `router.replace("/")`. On `/`, call store
  actions directly.

**Toaster**: bottom-center (above mobile sheet), stack of max 3, `bg-bg border border-line-strong`,
mono label message + muted detail + optional action link; enter: slide up 8px + fade; `aria-live=polite`.

**AppShell** also runs `useSpin.getState().hydrate()` once on mount (client), renders `<Toaster/>`,
`<CommandPalette/>`, and the header. `app/not-found.tsx`: "404 // THIS IDEA DOES NOT EXIST (YET)."
with SPIN button. `app/icon.svg`: tiny wheel glyph (white circle hairline + 18 ticks on black).
`app/manifest.ts`: name, short_name "SPIN//BUILD", black theme/background, display standalone.

**ChaosSlider**: native `<input type="range" min=0 max=100 step=1>` (accessible, arrow keys), custom
styled: 1px track `bg-line-strong`, filled portion `bg-fg`, band ticks at 20/40/60/80 (small
vertical hairlines), square 14px thumb `bg-fg` (focus ring). Labels: `SANE` left, `UNHINGED` right
(mono, muted); above: `CHAOS` + big tabular value `42%` + band label from `chaosBand()` e.g.
`EXPERIMENTAL` and its description ("Experimental products.") in muted small. `aria-valuetext`
"42 percent, experimental products". Values ≥ 80 subtly invert the value chip. `compact` = one line.

---

## 3. LAB — home `/` (ui-lab)

### Desktop (≥ 1024px): full viewport below header (`h-[calc(100dvh-56px)]`), 12-col grid, gutters 24–32px.
- **Left rail (cols 1–3)**: hero `BUILD SOMETHING` / `THAT SHOULDN'T` / `EXIST.` as `.display`
  (clamp 40–84px). Under it, mono small muted, 3 lines: `Real trends.` / `Controlled randomness.` /
  `Questionable decisions.` Lower: quick links as hairline rows with arrows: `DAILY // 0266 →`,
  `FUSE TWO IDEAS →`, `⌘K COMMANDS`. Bottom: tiny "INDEX" of the 6 genes
  (`TOPIC × USER × MECHANIC × TREND × CHAOS × CONSTRAINT = NEW IDEA`) in mono micro.
- **Center (cols 4–9)**: the wheel, as large as possible: `size = min(100%, calc(100dvh - 56px - 96px))`,
  centered. Under it: `SPACE TO SPIN` (Kbd SPACE + label) and, on touch, `TAP OR FLICK TO SPIN`.
- **Right rail (cols 10–12)**: SYSTEM readout, mono `.label` rows with hairline separators:
  `TREND ENGINE: ONLINE` (TrendEngineStatus), `POOL: {POOL_ATOMS + live trend count} IDEAS`,
  `REGION: GLOBAL` (RegionToggle), `CHAOS: 42%`, `SEED: RANDOM` (after a spin: the seed, scrambled
  in), `AUDIO: OFF` (AudioToggle). Then `<ChaosSlider/>`. Then, when relevant: `INJECTED TREND: AI
  AGENTS ✕` (click ✕ → injectTrend(null)) and `LOCKED: DOMAIN · TARGET` + `CLEAR` button.
- **Bottom strip**: trend ticker — single-line marquee of the top ~16 trend titles from
  `useSpin().trends` (`AI AGENTS / BRAINROT VIDEOS / …`), mono, muted, hairline top border,
  pauses on hover, static under reduced motion. Each item is a button that injects the trend.
- Subtle background: a faint 1px grid or crosshair registration marks at the wheel's bounding box
  corners (lab/instrument feel) — `border-line` opacity, nothing louder.

### Spin → reveal → result sequence
1. SPACE / hub click / flick → `spin()`. Wheel spins (`spinId`, `targetIndex =
   sectorPosition(current.dna.domain.sector)`); readout ticks; `SEED:` scrambles to the new seed.
   Space during spin is ignored.
2. Wheel `onSettle` → `settle()` → `flashInvert()` → **reveal** overlay over the wheel area:
   (a) the landed sector label expands from the selector to a huge centered `.display` word
   (e.g. `PRODUCTIVITY`) with the domain short underneath (`STUDY & FOCUS`), ~450ms;
   (b) the remaining genes decode one by one in a compact mono list (TARGET, MECHANIC, TREND, CHAOS,
   CONSTRAINT) with `ScrambleText`, 140ms stagger; (c) `IDEA GENERATED // #08421` stamps in;
   then `finishReveal()` (~1.6s total). Click / Space / Enter / Esc during reveal → `skipToResult()`.
   Reduced motion: no expansion/decoding — go straight to result after settle.
3. **Result**: transition away from the roulette: the wheel column collapses (wheel scales to a
   small "mini wheel" in the left rail, still showing the landed sector inverted, clickable to go
   back / spin again), and `<IdeaResult mode="lab" revealKey={revealId}/>` takes the main area
   (cols 4–12), entering with a 12px rise + fade. `backToWheel()` returns to the big wheel.
   Spinning again from result (SPACE / SPIN button) goes back to the big wheel and spins.
4. `/?cmd=spin|cursed|randomize` on mount → run after the first frame (wheel mounted), then
   `router.replace("/")`.

### Keyboard (lab, via `useHotkeys`)
SPACE spin (skip reveal if revealing) · R reroll · M mutate overlay · 1–6 toggle locks of DNA rows
(DNA_KEYS order) · S save · B build brief overlay · SHIFT+S share overlay · ESC back to wheel (when
no overlay open) · ⌘/Ctrl+K palette (shell). Ignore when typing; ignore SPACE when focus is on a
button/link other than the hub (native activation handles it).

### Mobile (< 768px)
- Compact hero (2 lines, ~36px) above the wheel; wheel `width: calc(100vw - 32px)` — still huge;
  compact system line under it (`ONLINE · GLOBAL · 42%` + chaos slider).
- Result lives in a **bottom sheet**: after reveal the sheet peeks (≈ 132px: `IDEA GENERATED //
  #08421` + concept name + "SWIPE UP ↑"). Drag/swipe up expands to ~88dvh (motion `drag="y"` with
  snap points, or pointer events); swipe down collapses; the sheet content is `<IdeaResult mode="lab"/>`
  with the action bar sticky at the sheet bottom. Handle is a 36×4 bar; tapping it toggles.
  Touch targets ≥ 44px.

### A11y
`<main>` landmark, `<h1>` is the hero (visually the display text). `aria-live="polite"` region
announces "Spinning…", "Landed on PRODUCTIVITY", "Idea generated: PROCRASTINATION BOSS".

---

## 4. Idea result (ui-idea)

### Layout (`IdeaResult`, desktop, inside cols 4–12)
- **Eyebrow row**: `IDEA GENERATED // #08421` (mono) · `SEED k3x9q2a` · `CHAOS 42%` · mutation
  chips (`+WEIRD`, `+SOCIAL`), an `AUTO-MUTATED: TOO BORING` chip when `idea.autoMutated`, and for
  fuse: `A × B` parents. Right: `SPIN AGAIN` (lab mode).
- **Two columns**: left (≈ 34%) **DNA panel**, right **concept**.
- **DNA panel**: six rows (DNA_KEYS order). Row = index `01`–`06` (mono micro) · label (`DOMAIN`,
  mono muted) · value (grotesk uppercase 18–20px, e.g. `PRODUCTIVITY`; for trend: title + source
  micro `SEEN: TECHNOLOGY / VIDEO`; for chaos: short + the rule sentence in muted small; for
  constraint: short + text) · **lock button** (square 40px, `LockIcon`, `aria-pressed`, label
  "Lock domain", hint Kbd `1`). Locked row: 2px fg left rule + value stays static during reroll +
  lock icon filled; unlocked rows re-decode (`ScrambleText trigger={revealKey}`) on reroll/mutate.
  Under the panel: `REROLL UNLOCKED (R)` button — the fastest, most satisfying action: instant, rows
  scramble for ~260ms, the concept name decodes, pitch cross-fades.
- **Concept**: name as huge `.display` (clamp 48–128px, wraps, `ScrambleText`), pitch in large
  regular grotesk (clamp 20–30px, max 34ch) wrapped in “ ”, then a hairline grid of sections:
  `WHY IT'S INTERESTING` (paragraph) · `CORE LOOP` (numbered `01`–`05` mono + step text) · `MVP`
  (square bullets) · `BUILD STACK` (rows: layer mono muted | name) · `DIFFICULTY` (4-cell scale
  EASY/MEDIUM/HARD/UNHINGED with the active cell inverted) · `ESTIMATED BUILD` (4-cell scale
  3 HOURS/1 DAY/WEEKEND/1 WEEK) · `VIRAL POTENTIAL` (see below) · `HOOK` (one-liner, emphasized).
- **Action bar** (sticky at bottom of the result on desktop; in the sheet on mobile):
  `BUILD THIS` (solid, B) · `REROLL` (R) · `MUTATE` (M) · `SAVE` (S, pressed when saved) ·
  `SHARE` (⇧S). View mode: `OPEN IN LAB` · `SAVE` · `SHARE` · `BUILD THIS`.
- **Viral meter**: 20 thin vertical bars, filled count = score/5, label tier (`SCREENSHOT BAIT`),
  caption `VIBES-BASED ESTIMATE. NOT SCIENCE.`, reasons as muted micro list. Bars fill with a 12ms
  stagger on reveal (instant under reduced motion).

### MUTATE (overlay "mutate")
Small command interface anchored above the MUTATE button (popover; on mobile a sheet): header
`MUTATE //`, list of the 9 MUTATIONS (label + one-line effect description, number key hints 1–9),
↑/↓/Enter, Esc closes. Selecting → `mutate(kind)` → toast `MUTATION // MORE WEIRD`, overlay closes,
result re-decodes (name + changed rows).

### BUILD THIS (overlay "brief", `Dialog size="full"`)
Title `BUILD BRIEF // PROCRASTINATION BOSS`. Top: progress rail (mono micro): `SPIN ✓ → DISCOVER ✓
→ MUTATE ✓/○ → MVP ✓ → PROMPT ○ → BUILD ○` (PROMPT becomes ✓ after copying). Sections in a 12-col
editorial layout: PRODUCT (name + pitch), USER PROBLEM, CORE LOOP, MVP FEATURES, DATA MODEL
(entity cards: name + field list in mono), REQUIRED APIs, TECH STACK, IMPLEMENTATION STEPS
(numbered). Primary action (header `actions` + bottom): `COPY BUILD PROMPT` (solid) → `copyText(
briefToPrompt(idea))` → button label flips to `COPIED ✓` + toast "BUILD PROMPT COPIED" detail
"PASTE IT INTO YOUR CODING AGENT". Secondary: `COPY IDEA` (ideaToText). Show a collapsible preview of
the prompt text (mono, scrollable, max-h 320px).

### SHARE (overlay "share", `Dialog`)
Left: live preview of the 1080×1350 share card (the canvas scaled to fit, or an `<img>` of its data
URL). Right: `COPY IDEA` (ideaToText), `COPY LINK` (absoluteUrl(`/idea/${code}`)), `EXPORT IMAGE`
(download PNG named `spin-build-<number>.png` via object URL), `SHARE…` (navigator.share with
files when supported). Shows the URL in a mono read-only field.

### Share card (canvas 1080×1350, black background, white type)
Top-left `SPIN//BUILD` (grotesk semibold 40px, `//` gray); top-right `IDEA #08421` (mono 28px).
Hairline rule. Name huge (grotesk 600, auto-fit 150→84px, tight tracking −0.04em, up to 3 lines).
DNA stack mono 34px: `PRODUCTIVITY` / `× STUDENTS` / `× MULTIPLAYER` / `× AI AGENTS` / `× HOSTILE UX`
(/ `× NO LOGIN`). Pitch in quotes, grotesk 40px, line-height 1.2, max 6 lines with ellipsis.
Bottom: hairline, `SEED // 08421` left (mono 28px gray), host right (e.g. `spin.build` or
`location.host`), and a small 18-tick wheel glyph. Use the page's actual font families (read
`getComputedStyle(document.body).fontFamily` and the `--font-mono-face` variable) after
`document.fonts.ready`. Deterministic layout; no external images.

### IdeaCard (lists)
Hairline row: `#08421` mono · name (grotesk uppercase 20px) · DNA line (`dnaLine`, mono micro,
truncate) · meta slot (timeAgo, chaos) · actions slot. `compact` = single line.

---

## 5. Pages (ui-pages)

### TREND PULSE `/trends`
Header `.display`: `WHAT THE INTERNET` / `IS OBSESSED WITH.`; status line (mono):
`TREND ENGINE // ONLINE · 4 OF 6 SOURCES · GLOBAL · UPDATED 2 MIN AGO` + `RegionToggle` + refresh
button (`refreshTrends()`). Category filter chips (ALL + categories present). Grid of editorial cards
(hairline grid lines between cells, 4 cols desktop / 2 tablet / 1 mobile):
```
01                              ↑ HOT
AI AGENTS
TECH
Seen across: Technology / Video
[ INJECT INTO ROULETTE ]
```
Index big mono (`01`), heat label with arrow (HOT ↑, RISING ↗, STEADY →), title grotesk uppercase
24–28px, category mono, "Seen across" from `sources` via TREND_SOURCE_LABEL, optional source link
↗ (external, `rel="noopener noreferrer"`), and `[ INJECT INTO ROULETTE ]` (outline button; when
injected: inverted `INJECTED ✓`). Inject → `injectTrend(t)` + toast with action `GO SPIN →` (href `/`).
Cards enter with a short stagger (snap into place). Below: **SOURCES** table — each provider:
name, state (OK / DEGRADED / DOWN / DISABLED), reason (`NO API KEY`), count, latency. Footnote:
"Scores are internal roulette weights (recency, source signal, cross-source overlap, novelty,
buildability) — not a measure of objective popularity."
Initial render must show curated trends instantly (store starts with the fallback snapshot).

### SAVED `/saved` and HISTORY `/history`
Same component with tabs `SAVED (n)` | `HISTORY (n)` (links, so each has its URL). Rows use
`IdeaCard` with actions: `OPEN` (`loadIdea(entry.idea, { record: false })` + `router.push("/")`),
save toggle, `COPY LINK`, `DELETE`. History shows locked genes as micro chips. `CLEAR HISTORY`
(keeps saved; confirm inline "ARE YOU SURE? YES / NO"). Empty states: `NOTHING SAVED YET.` /
`SPIN SOMETHING WORTH KEEPING.` + SPIN link. Everything local; say so: "STORED ON THIS DEVICE ONLY."
Must render safely before hydration (show a skeleton row set, not an empty-state flash).

### ABOUT `/about`
Editorial long page: the formula (`TOPIC × USER × MECHANIC × TREND × CHAOS × CONSTRAINT = NEW IDEA`
huge), what it is, how the roulette works (seeded, deterministic, share codes), chaos bands table
(CHAOS_BANDS), trend engine & sources (honest: internal weighting, fallbacks), privacy (no account,
local storage), keyboard shortcuts table, credits (Hacker News/Algolia, Google Trends RSS, YouTube,
GIPHY, Reddit/Lobsters, JokeAPI). Server component.

### DAILY `/daily`
`DAILY // 0266` (mono, huge number), `ONE INTERNET.` / `ONE IDEA.` / `24 HOURS.` display,
the UTC date, countdown to next daily (`NEXT DROP IN 06:12:44`, client). Idea from
`dailyIdea(today UTC)` rendered with `<IdeaResult mode="view" eyebrow="DAILY // 0266"/>` and
`onOpenInLab` → `loadIdea(idea)` + push("/"). `SHARE DAILY` (ShareDialog with eyebrow). Compute on
the client after mount (UTC date) to avoid hydration mismatch around midnight, but render a
server-side version for the initial paint using the server's UTC date (pass as prop) — deterministic
either way.

### FUSE `/fuse`
Header `FUSE` + `IDEA A × IDEA B = ONE PRODUCT.` Two parent cards side by side (stack on mobile),
each: `IDEA A` label, name, pitch, DNA mini line, `REROLL A` / `USE CURRENT IDEA` (if `useSpin`
has a current idea). Center: a big `×`. `FUSE` button (solid, large). Fusion animation (motion):
cards physically slide toward the center, overlap with slight rotation, flash invert, and merge into
one card (shared `layoutId` morph) → the fused `IdeaResult mode="view" eyebrow="FUSED // A × B"`.
Reduced motion: cross-fade. Actions: `FUSE AGAIN`, `OPEN IN LAB`, save/share/build via IdeaResult.
Examples strip (muted): `language learning × dating`, `music discovery × location game`,
`personal finance × multiplayer competition`, `food discovery × social deduction`.
Parents generated with `spinIdea({ chaos, region, trendPool })` using the store's chaos/region/trends.

### SHARED IDEA `/idea/[code]`
Server component: `const { code } = await params` (Next 16: params is a Promise);
`ideaFromCode(code)` (pure, works on the server) → `notFound()` if null. `generateMetadata`:
title = concept name, description = pitch. Renders a client viewer with
`<IdeaResult mode="view" eyebrow="SHARED IDEA // #08421"/>` + `OPEN IN LAB` (loadIdea + push("/")) +
`SPIN YOUR OWN →`. `opengraph-image.tsx` (next/og `ImageResponse`, 1200×630, black bg, white text:
wordmark, name, DNA line, pitch) — read node_modules/next/dist/docs for the Next 16 API (params
Promise). `createdAt` differs per render — don't render it.

---

## 6. Motion reference

| Moment | Motion |
|---|---|
| Wheel | custom physics (roulette component) |
| Settle | `flashInvert(160)` |
| Sector expand | scale 0.4→1 + letter-spacing 0.3em→−0.04em, 450ms `--ease-out` |
| DNA decode | `ScrambleText` 360–520ms, 140ms stagger |
| Result enter | y 12→0, opacity 0→1, 320ms |
| Reroll | unlocked rows scramble 260ms; name decode 420ms; pitch cross-fade 180ms |
| Lock | shackle swing (LockIcon), row rule grows 0→2px 160ms |
| Cards (trends/fuse) | snap: y 8→0 + opacity, spring stiff (stiffness 500, damping 38), 30ms stagger |
| Fuse | cards translate to center + rotate ±4°, overlap, invert flash, layout morph |
| Ticker | CSS marquee 60s linear; paused on hover/reduced motion |

Everything collapses to instant/opacity-only under `prefers-reduced-motion`.
