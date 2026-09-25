/**
 * `useSpin` — the lab's single source of truth (docs/ARCHITECTURE.md §6).
 *
 * Lifecycle of a wheel spin:
 *
 *   idle ──spin()──▶ spinning ──settle()──▶ revealing ──finishReveal()──▶ result
 *                      │  └────────── skipToResult() ─────────────────────▲
 *                      └─ the idea is computed *before* the phase changes, so
 *                         the wheel animates towards an already-decided sector.
 *
 * reroll / mutate / loadIdea jump straight to "result" (revealId++).
 * Every idea that reaches the user is recorded to history exactly once per
 * reveal; persistence is fire-and-forget through an ordered, idle-time queue,
 * so no action ever awaits storage or the network. The initial state is
 * deterministic and SSR-safe; `hydrate()` (called once on the client) loads
 * settings/history and starts the trend + spark fetches in the background.
 */
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { comboKey, mutateIdea, rerollIdea, spinIdea, type SpinOptions } from "@/lib/generator";
import { fallbackSnapshot, fetchSpark, fetchTrendSnapshot } from "@/lib/trends/client";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  clampChaos,
  clearHistoryList,
  getStorage,
  mergeHistoryLists,
  mergeRecent,
  normalizeLocks,
  patchHistory,
  pushRecent,
  removeFromHistory,
  upsertHistory,
  type StorageAdapter,
} from "@/lib/storage";
import type {
  DnaKey,
  HistoryEntry,
  Idea,
  IdeaDNA,
  MutationKind,
  Region,
  SectorId,
  Settings,
  Trend,
  TrendSnapshot,
} from "@/types";
import { REGIONS } from "@/types";
import { createPersistQueue } from "./persist-queue";

/* ── Types ────────────────────────────────────────────────────────────────── */

export type Phase = "idle" | "spinning" | "revealing" | "result";
export type TrendSync = "idle" | "syncing" | "ready" | "failed";

export interface Spark {
  text: string;
  tags: string[];
}

export interface SpinRequest {
  /** Cursed spin: chaos forced to 100 for this spin only (the slider is untouched). */
  cursed?: boolean;
  /** One-off chaos override for this spin (clamped); defaults to the slider. */
  chaos?: number;
  /** Explicit seed (reproducible spins); defaults to a random one inside the generator. */
  seed?: string;
}

export interface SpinState {
  phase: Phase;
  /** Increments per wheel spin (the wheel animates on change). */
  spinId: number;
  /** Increments whenever a new idea is shown without a wheel spin (reroll / mutate / loadIdea). */
  revealId: number;
  targetSector: SectorId | null;
  /** Idea being revealed or shown. */
  current: Idea | null;
  /** The idea shown before `current` (undo / fuse). */
  previous: Idea | null;
  /** Genes of `current` to hold on the next spin/reroll, in DNA order. */
  locks: DnaKey[];
  /** Forced trend for the next spin/reroll. While set, "trend" is always in `locks`. */
  injectedTrend: Trend | null;
  chaos: number;
  region: Region;
  audio: boolean;
  lang: "vi" | "en";
  /** Starts as the curated fallback for GLOBAL, replaced by live data when it arrives. */
  trends: TrendSnapshot;
  trendSync: TrendSync;
  spark: Spark | null;
  /** Newest first; saved entries are never evicted by the cap. */
  history: HistoryEntry[];
  /** Recent comboKeys, newest first, fed to the generator for repeat avoidance. */
  recent: string[];
  /** True once `hydrate()` has loaded persisted settings/history. */
  hydrated: boolean;
}

export interface SpinActions {
  /** Load settings/history/recent; kick off trend sync + spark. Idempotent. */
  hydrate(): Promise<void>;
  /** Computes the idea FIRST, then enters "spinning". Ignored while already spinning. */
  spin(opts?: SpinRequest): void;
  /** Wheel stopped: "spinning" → "revealing". */
  settle(): void;
  /** Reveal done: "revealing" → "result"; records history + recent combo. */
  finishReveal(): void;
  /** Reduced motion / impatient users: "spinning" | "revealing" → "result" (records once). */
  skipToResult(): void;
  /** New idea keeping locked genes, no wheel (revealId++). Needs a current idea. */
  reroll(): void;
  mutate(kind: MutationKind): void;
  toggleLock(key: DnaKey): void;
  /** Releases every lock and cancels a pending injected trend. */
  clearLocks(): void;
  /** Force `trend` on the next spin/reroll and lock "trend"; `null` cancels and unlocks. */
  injectTrend(trend: Trend | null): void;
  setChaos(n: number): void;
  setRegion(r: Region): void;
  setAudio(on: boolean): void;
  setLang(lang: "vi" | "en"): void;
  /** Never throws; keeps the current (fallback) trends when the fetch fails. */
  refreshTrends(opts?: { force?: boolean }): Promise<void>;
  /** Show an idea directly as "result" (FUSE, DAILY, shared links, history). Records by default. */
  loadIdea(idea: Idea, opts?: { record?: boolean }): void;
  /** Phase "idle"; `current` is kept so locks still apply. */
  backToWheel(): void;
  /** Flip `saved` for `id` (default: the current idea, added to history if missing). */
  toggleSave(id?: string): void;
  removeHistory(id: string): void;
  /** Clears history; saved ideas are kept unless `keepSaved: false`. */
  clearHistory(opts?: { keepSaved?: boolean }): void;
  /** Write pending settings/history now (page hide, tests). */
  flush(): Promise<void>;
}

export type SpinStore = SpinState & SpinActions;

export interface SpinStoreOptions {
  /** Storage resolver; defaults to `getStorage` (localStorage or memory). */
  storage?: () => StorageAdapter;
  /** Debounce for settings writes (slider drags fire continuously). */
  settingsDebounceMs?: number;
  /** Client-side timeout for the trend snapshot fetch. */
  trendTimeoutMs?: number;
  /** Defer storage writes to idle time (default: when `requestIdleCallback` exists). */
  idlePersistence?: boolean;
  /** Error sink for recoverable failures; defaults to console.error. */
  onError?: (scope: string, error: unknown) => void;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function initialState(): SpinState {
  return {
    phase: "idle",
    spinId: 0,
    revealId: 0,
    targetSector: null,
    current: null,
    previous: null,
    locks: [],
    injectedTrend: null,
    chaos: DEFAULT_SETTINGS.chaos,
    region: DEFAULT_SETTINGS.region,
    audio: DEFAULT_SETTINGS.audio,
    lang: DEFAULT_SETTINGS.lang,
    trends: fallbackSnapshot(DEFAULT_SETTINGS.region),
    trendSync: "idle",
    spark: null,
    history: [],
    recent: [],
    hydrated: false,
  };
}

function defaultReport(scope: string, error: unknown): void {
  console.error(`[spin-store] ${scope} failed:`, error);
}

function copyGene<K extends DnaKey>(into: Partial<IdeaDNA>, from: IdeaDNA, key: K): void {
  into[key] = from[key];
}

/** The genes of `current` selected by `keys`, or undefined when nothing is held. */
function heldGenes(current: Idea | null, keys: readonly DnaKey[]): Partial<IdeaDNA> | undefined {
  if (!current || keys.length === 0) return undefined;
  const genes: Partial<IdeaDNA> = {};
  for (const key of keys) copyGene(genes, current.dna, key);
  return genes;
}

/** Shared generator context: live trend pool, repeat avoidance, spark bias. */
function generationContext(
  state: SpinState,
): Pick<SpinOptions, "trendPool" | "recent" | "chaosBias"> {
  return {
    recent: state.recent,
    ...(state.trends.trends.length > 0 ? { trendPool: state.trends.trends } : {}),
    ...(state.spark && state.spark.tags.length > 0 ? { chaosBias: state.spark.tags } : {}),
  };
}

function isRegion(value: unknown): value is Region {
  return REGIONS.some((r) => r === value);
}

/* ── Store ────────────────────────────────────────────────────────────────── */

export function createSpinStore(options: SpinStoreOptions = {}): UseBoundStore<StoreApi<SpinStore>> {
  const storage = options.storage ?? getStorage;
  const settingsDebounceMs = options.settingsDebounceMs ?? 300;
  const trendTimeoutMs = options.trendTimeoutMs ?? 8000;
  const report = options.onError ?? defaultReport;
  const queue = createPersistQueue({
    onError: (label, error) => report(`persist:${label}`, error),
    idle: options.idlePersistence,
  });

  return create<SpinStore>()((set, get) => {
    /* Per-store runtime (not state: nothing here should re-render the UI). */
    let hydration: Promise<void> | null = null;
    let lifecycleAttached = false;
    let settingsTimer: ReturnType<typeof setTimeout> | null = null;
    /** Settings the user changed before hydration finished; they win over stored values. */
    const touchedSettings = new Set<keyof Settings>();
    /** Spun idea not yet recorded (its reveal is still in flight). */
    let pending: Idea | null = null;
    /** Which genes were held when `current` was generated (stored on its history entry). */
    let currentLocked: DnaKey[] = [];
    let trendTicket = 0;
    let trendAbort: AbortController | null = null;
    /** Last live snapshot per region, so switching regions back and forth never flashes curated data. */
    const liveSnapshots = new Map<Region, TrendSnapshot>();

    function attempt<T>(scope: string, fn: () => T): T | null {
      try {
        return fn();
      } catch (error) {
        report(scope, error);
        return null;
      }
    }

    /* Settings persistence */

    function enqueueSettings(): void {
      const { chaos, region, audio, lang } = get();
      const settings: Settings = { chaos, region, audio, lang };
      queue.enqueue("settings", () => storage().putSettings(settings));
    }

    function persistSettingsSoon(): void {
      if (settingsTimer) clearTimeout(settingsTimer);
      settingsTimer = setTimeout(() => {
        settingsTimer = null;
        enqueueSettings();
      }, settingsDebounceMs);
    }

    function touchSetting(key: keyof Settings): void {
      // Before hydration, writing would clobber stored values the user has not
      // seen yet; remember the change and reconcile in hydrate() instead.
      if (get().hydrated) persistSettingsSoon();
      else touchedSettings.add(key);
    }

    /* History */

    function record(idea: Idea, locked: readonly DnaKey[], saved?: boolean): void {
      if (pending && pending.id === idea.id) pending = null;
      const { history, recent } = get();
      const existing = history.find((e) => e.id === idea.id);
      const entry: HistoryEntry = {
        id: idea.id,
        // Monotonic, so a clock that jumps backwards cannot bury a fresh idea.
        timestamp: Math.max(Date.now(), history.length > 0 ? history[0].timestamp : 0),
        seed: idea.recipe.seed,
        idea,
        locked: normalizeLocks(locked),
        // Re-recording an idea (e.g. today's DAILY again) must never un-save it.
        saved: saved ?? existing?.saved ?? false,
      };
      const key = attempt("comboKey", () => comboKey(idea.dna));
      set({
        history: upsertHistory(history, entry),
        ...(key ? { recent: pushRecent(recent, key) } : {}),
      });
      queue.enqueue("history", () => storage().putHistory(entry));
      if (key) queue.enqueue("recent", () => storage().pushRecentCombo(key));
    }

    /** Record the in-flight spin result, if any. */
    function recordPending(): void {
      if (pending) record(pending, currentLocked);
    }

    /**
     * Something is about to replace `current`. An idea mid-reveal has been seen,
     * so it is recorded; one still behind the spinning wheel never was, so it is dropped.
     */
    function resolvePending(phase: Phase): void {
      if (phase === "revealing") recordPending();
      pending = null;
    }

    /** Show a freshly generated idea without the wheel. */
    function showInstantly(idea: Idea, extra: Partial<SpinState> = {}): void {
      const state = get();
      set({
        current: idea,
        previous: state.current,
        phase: "result",
        revealId: state.revealId + 1,
        targetSector: idea.dna.domain.sector,
        ...extra,
      });
    }

    /* Background loading */

    async function loadSpark(): Promise<void> {
      try {
        const spark = await fetchSpark();
        if (spark && typeof spark.text === "string" && Array.isArray(spark.tags)) {
          set({ spark: { text: spark.text, tags: spark.tags.filter((t) => typeof t === "string") } });
        }
      } catch (error) {
        report("spark", error);
      }
    }

    async function resyncHistory(): Promise<void> {
      try {
        await queue.flush();
        set({ history: await storage().getHistory() });
      } catch (error) {
        report("history-resync", error);
      }
    }

    function attachLifecycle(): void {
      if (lifecycleAttached || typeof window === "undefined" || typeof document === "undefined") {
        return;
      }
      lifecycleAttached = true;
      const flushNow = () => void get().flush();
      window.addEventListener("pagehide", flushNow);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          flushNow();
        } else if (document.visibilityState === "visible") {
          // Auto-revalidate live trends if stale (> 10 minutes)
          const lastFetched = get().trends.fetchedAt;
          if (Date.now() - lastFetched > 10 * 60 * 1000) {
            void get().refreshTrends();
          }
        }
      });

      // Background recurring auto-crawl interval: every 10 minutes
      setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          void get().refreshTrends();
        }
      }, 10 * 60 * 1000);

      // Another tab saved/removed/cleared history: pick it up.
      window.addEventListener("storage", (event) => {
        if (event.key === null || event.key === STORAGE_KEYS.history) void resyncHistory();
      });
    }

    async function runHydration(): Promise<void> {
      try {
        const adapter = storage();
        const [stored, history, recent] = await Promise.all([
          adapter.getSettings().catch((error: unknown): Settings | null => {
            report("hydrate:settings", error);
            return null;
          }),
          adapter.getHistory().catch((error: unknown): HistoryEntry[] => {
            report("hydrate:history", error);
            return [];
          }),
          adapter.getRecentCombos().catch((error: unknown): string[] => {
            report("hydrate:recent", error);
            return [];
          }),
        ]);
        const state = get();
        const base = stored ?? DEFAULT_SETTINGS;
        const settings: Settings = {
          chaos: touchedSettings.has("chaos") ? state.chaos : base.chaos,
          region: touchedSettings.has("region") ? state.region : base.region,
          audio: touchedSettings.has("audio") ? state.audio : base.audio,
          lang: touchedSettings.has("lang") ? state.lang : base.lang,
        };
        set({
          ...settings,
          ...(settings.region !== state.region
            ? { trends: liveSnapshots.get(settings.region) ?? fallbackSnapshot(settings.region) }
            : {}),
          // Anything recorded before hydration finished is newer than storage: it wins.
          history: mergeHistoryLists(state.history, history),
          recent: mergeRecent(state.recent, recent),
          hydrated: true,
        });
        if (touchedSettings.size > 0) {
          touchedSettings.clear();
          persistSettingsSoon();
        }
      } catch (error) {
        report("hydrate", error);
        set({ hydrated: true });
      }
      attachLifecycle();
      void get().refreshTrends();
      void loadSpark();
    }

    /* Actions */

    return {
      ...initialState(),

      hydrate() {
        hydration ??= runHydration();
        return hydration;
      },

      spin(opts = {}) {
        const state = get();
        if (state.phase === "spinning") return;
        const cursed = opts.cursed === true;
        const chaos = cursed ? 100 : clampChaos(opts.chaos ?? state.chaos, state.chaos);
        const injected = state.injectedTrend;
        // An injected trend replaces the held one; never send both.
        const heldKeys = injected ? state.locks.filter((k) => k !== "trend") : state.locks;
        const locked = heldGenes(state.current, heldKeys);
        const spinOptions: SpinOptions = {
          chaos,
          region: state.region,
          kind: cursed ? "cursed" : "spin",
          ...generationContext(state),
          ...(locked ? { locked } : {}),
          ...(injected ? { injectedTrend: injected } : {}),
          ...(opts.seed ? { seed: opts.seed } : {}),
        };
        const idea = attempt("spin", () => spinIdea(spinOptions));
        if (!idea) return;

        resolvePending(state.phase);
        pending = idea;
        const applied: DnaKey[] = locked ? [...heldKeys] : [];
        currentLocked = normalizeLocks(injected ? [...applied, "trend"] : applied);
        set({
          current: idea,
          previous: state.current,
          targetSector: idea.dna.domain.sector,
          phase: "spinning",
          spinId: state.spinId + 1,
          ...(injected ? { injectedTrend: null, locks: normalizeLocks([...state.locks, "trend"]) } : {}),
        });
      },

      settle() {
        if (get().phase === "spinning") set({ phase: "revealing" });
      },

      finishReveal() {
        if (get().phase !== "revealing") return;
        set({ phase: "result" });
        recordPending();
      },

      skipToResult() {
        const { phase } = get();
        if (phase !== "spinning" && phase !== "revealing") return;
        set({ phase: "result" });
        recordPending();
      },

      reroll() {
        const state = get();
        const prev = state.current;
        if (!prev || state.phase === "spinning") return;
        const injected = state.injectedTrend;
        const locks = injected ? state.locks.filter((k) => k !== "trend") : state.locks;
        // A cursed idea rerolls cursed; everything else rerolls at the slider's chaos.
        const cursed = prev.recipe.kind === "cursed";
        const rerollOptions: Omit<SpinOptions, "locked"> = {
          chaos: cursed ? 100 : state.chaos,
          region: state.region,
          kind: cursed ? "cursed" : "spin",
          ...generationContext(state),
          ...(injected ? { injectedTrend: injected } : {}),
        };
        const idea = attempt("reroll", () => rerollIdea(prev, locks, rerollOptions));
        if (!idea) return;

        resolvePending(state.phase);
        currentLocked = normalizeLocks(injected ? [...locks, "trend"] : locks);
        showInstantly(
          idea,
          injected ? { injectedTrend: null, locks: normalizeLocks([...state.locks, "trend"]) } : {},
        );
        record(idea, currentLocked);
      },

      mutate(kind) {
        const state = get();
        const prev = state.current;
        if (!prev || state.phase === "spinning") return;
        const idea = attempt(`mutate:${kind}`, () => mutateIdea(prev, kind));
        if (!idea) return;

        resolvePending(state.phase);
        // The chaos slider is deliberately NOT synced to idea.recipe.chaos: the
        // slider is the user's standing preference for future spins (and is
        // persisted); a mutation is a one-off edit of this idea, whose own chaos
        // is shown in its DNA readout.
        currentLocked = state.locks.slice();
        showInstantly(idea);
        record(idea, currentLocked);
      },

      toggleLock(key) {
        const { locks, current, injectedTrend } = get();
        if (locks.includes(key)) {
          set({
            locks: locks.filter((k) => k !== key),
            // Unlocking the trend while an injection is pending cancels the injection.
            ...(key === "trend" && injectedTrend ? { injectedTrend: null } : {}),
          });
          return;
        }
        if (!current) return; // nothing to hold yet
        set({ locks: normalizeLocks([...locks, key]) });
      },

      clearLocks() {
        const { locks, injectedTrend } = get();
        if (locks.length === 0 && !injectedTrend) return;
        set({ locks: [], injectedTrend: null });
      },

      injectTrend(trend) {
        const { locks } = get();
        if (trend) set({ injectedTrend: trend, locks: normalizeLocks([...locks, "trend"]) });
        else set({ injectedTrend: null, locks: locks.filter((k) => k !== "trend") });
      },

      setChaos(n) {
        if (!Number.isFinite(n)) return;
        const chaos = clampChaos(n);
        if (chaos === get().chaos) return;
        set({ chaos });
        touchSetting("chaos");
      },

      setRegion(region) {
        if (!isRegion(region) || region === get().region) return;
        set({ region, trends: liveSnapshots.get(region) ?? fallbackSnapshot(region) });
        touchSetting("region");
        void get().refreshTrends();
      },

      setLang(lang) {
        if (get().lang === lang) return;
        set({ lang });
        touchSetting("lang");
      },

      setAudio(on) {
        if (get().audio === on) return;
        set({ audio: on });
        touchSetting("audio");
      },

      async refreshTrends(opts = {}) {
        const region = get().region;
        const ticket = ++trendTicket;
        trendAbort?.abort();
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        trendAbort = controller;
        set({ trendSync: "syncing" });

        let snapshot: TrendSnapshot | null = null;
        try {
          snapshot = await fetchTrendSnapshot(region, {
            signal: controller?.signal,
            timeoutMs: trendTimeoutMs,
            force: opts.force,
          });
        } catch (error) {
          if (ticket === trendTicket) report("refreshTrends", error);
        }
        if (ticket !== trendTicket) return; // superseded (e.g. region switched mid-flight)
        trendAbort = null;

        if (snapshot && Array.isArray(snapshot.trends) && snapshot.trends.length > 0) {
          liveSnapshots.set(region, snapshot);
          set({ trends: snapshot, trendSync: "ready" });
        } else {
          set({ trendSync: "failed" }); // keep whatever we had (curated fallback)
        }
      },

      loadIdea(idea, opts = {}) {
        const state = get();
        resolvePending(state.phase);
        currentLocked = [];
        showInstantly(idea, {
          previous: state.current && state.current.id !== idea.id ? state.current : state.previous,
        });
        if (opts.record ?? true) record(idea, currentLocked);
      },

      backToWheel() {
        const { phase } = get();
        if (phase === "idle") return;
        resolvePending(phase);
        set({ phase: "idle" });
      },

      toggleSave(id) {
        const state = get();
        if (id === undefined && state.phase === "spinning") return; // not revealed yet
        const targetId = id ?? state.current?.id;
        if (!targetId) return;
        const existing = state.history.find((e) => e.id === targetId);
        if (existing) {
          const updated: HistoryEntry = { ...existing, saved: !existing.saved };
          set({ history: patchHistory(state.history, targetId, { saved: updated.saved }) });
          // Upsert (not update) so the entry exists in storage even if it was trimmed there.
          queue.enqueue("save", () => storage().putHistory(updated));
          return;
        }
        if (state.current && state.current.id === targetId) {
          record(state.current, currentLocked, true);
        }
      },

      removeHistory(id) {
        set({ history: removeFromHistory(get().history, id) });
        queue.enqueue("remove", () => storage().removeHistory(id));
      },

      clearHistory(opts = {}) {
        const keepSaved = opts.keepSaved ?? true;
        set({ history: clearHistoryList(get().history, keepSaved) });
        queue.enqueue("clear", () => storage().clearHistory({ keepSaved }));
      },

      async flush() {
        if (settingsTimer) {
          clearTimeout(settingsTimer);
          settingsTimer = null;
          enqueueSettings();
        }
        await queue.flush();
      },
    };
  });
}

/** The app's store. Non-React code can use `useSpin.getState()` / `useSpin.subscribe()`. */
export const useSpin = createSpinStore();
