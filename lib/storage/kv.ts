/**
 * One StorageAdapter implementation over a tiny synchronous key/value backend.
 * localStorage and memory adapters differ only in their backend, so they share
 * serialization, validation, caps, caching and quota recovery exactly.
 */
import type { HistoryEntry, Settings } from "@/types";
import type { StorageAdapter } from "./adapter";
import {
  capHistory,
  clearHistoryList,
  patchHistory,
  pushRecent,
  removeFromHistory,
  shedUnsaved,
  upsertHistory,
} from "./history";
import {
  HISTORY_CAP,
  RECENT_CAP,
  STORAGE_KEYS,
  type StorageKey,
  historyEntrySchema,
  parseHistory,
  parseRecent,
  parseSettings,
} from "./schema";

/**
 * - "ok": persisted.
 * - "quota": rejected for size; the backend still holds the value in memory.
 * - "error": storage unusable for this write; the backend still holds the value in memory.
 */
export type WriteResult = "ok" | "quota" | "error";

/** Synchronous, never-throwing key/value store. */
export interface KeyValueBackend {
  read(key: StorageKey): string | null;
  write(key: StorageKey, value: string): WriteResult;
  remove(key: StorageKey): void;
}

export interface KeyValueAdapterOptions {
  historyCap?: number;
  recentCap?: number;
  /** Called for recoverable problems (corrupt data dropped, quota trimming). Defaults to console.warn. */
  onWarning?: (message: string, detail?: unknown) => void;
}

const MAX_QUOTA_RETRIES = 8;

function defaultWarning(message: string, detail?: unknown): void {
  if (detail === undefined) console.warn(`[storage] ${message}`);
  else console.warn(`[storage] ${message}`, detail);
}

export function createKeyValueAdapter(
  backend: KeyValueBackend,
  options: KeyValueAdapterOptions = {},
): StorageAdapter {
  const historyCap = options.historyCap ?? HISTORY_CAP;
  const recentCap = options.recentCap ?? RECENT_CAP;
  const warn = options.onWarning ?? defaultWarning;

  /**
   * Parse cache: history can be ~1 MB of JSON, and every write is a
   * read-modify-write. Re-parse only when the raw string actually changed
   * (e.g. another tab wrote), otherwise reuse the validated list.
   */
  let historyCache: { raw: string; entries: HistoryEntry[] } | null = null;

  function readJson(key: StorageKey): unknown {
    const raw = backend.read(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      warn(`ignoring unreadable JSON in "${key}"`, err);
      return null;
    }
  }

  function readHistory(): HistoryEntry[] {
    const raw = backend.read(STORAGE_KEYS.history);
    if (raw === null) {
      historyCache = null;
      return [];
    }
    if (historyCache && historyCache.raw === raw) return historyCache.entries;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      warn(`ignoring unreadable history JSON`, err);
      return [];
    }
    const { entries, dropped } = parseHistory(json);
    if (dropped > 0) warn(`dropped ${dropped} corrupt or duplicate history record(s)`);
    const capped = capHistory(entries, historyCap);
    historyCache = { raw, entries: capped };
    return capped;
  }

  function writeHistory(entries: HistoryEntry[]): void {
    let list = entries;
    for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt++) {
      const raw = JSON.stringify(list);
      const result = backend.write(STORAGE_KEYS.history, raw);
      if (result === "ok") {
        historyCache = { raw, entries: list };
        if (list !== entries) {
          warn(`storage quota reached: kept ${list.length} of ${entries.length} history entries`);
        }
        return;
      }
      if (result === "error") break;
      const smaller = shedUnsaved(list);
      if (smaller.length === list.length) break;
      list = smaller;
    }
    // Nothing fit (or storage failed): the backend keeps the full list in memory for this session.
    const raw = JSON.stringify(entries);
    const final = backend.write(STORAGE_KEYS.history, raw);
    historyCache = { raw, entries };
    if (final !== "ok") warn(`history could not be persisted (${final}); keeping it in memory`);
  }

  function writeJson(key: StorageKey, value: unknown): void {
    const result = backend.write(key, JSON.stringify(value));
    if (result !== "ok") warn(`could not persist "${key}" (${result}); keeping it in memory`);
  }

  return {
    async getHistory() {
      return readHistory().slice();
    },

    async putHistory(entry) {
      const parsed = historyEntrySchema.safeParse(entry);
      if (!parsed.success) {
        warn(`refusing to persist malformed history entry "${String(entry?.id)}"`, parsed.error);
        return;
      }
      writeHistory(upsertHistory(readHistory(), parsed.data, historyCap));
    },

    async updateHistory(id, patch) {
      const current = readHistory();
      if (!current.some((e) => e.id === id)) return;
      writeHistory(patchHistory(current, id, patch, historyCap));
    },

    async removeHistory(id) {
      const current = readHistory();
      if (!current.some((e) => e.id === id)) return;
      writeHistory(removeFromHistory(current, id));
    },

    async clearHistory(opts) {
      const next = clearHistoryList(readHistory(), opts?.keepSaved ?? true);
      if (next.length === 0) {
        backend.remove(STORAGE_KEYS.history);
        historyCache = null;
        return;
      }
      writeHistory(next);
    },

    async getSettings() {
      return parseSettings(readJson(STORAGE_KEYS.settings));
    },

    async putSettings(settings: Settings) {
      const normalized = parseSettings(settings);
      if (!normalized) {
        warn("refusing to persist malformed settings", settings);
        return;
      }
      writeJson(STORAGE_KEYS.settings, normalized);
    },

    async getRecentCombos() {
      return parseRecent(readJson(STORAGE_KEYS.recent), recentCap);
    },

    async pushRecentCombo(key) {
      if (typeof key !== "string" || key.length === 0) return;
      const current = parseRecent(readJson(STORAGE_KEYS.recent), recentCap);
      writeJson(STORAGE_KEYS.recent, pushRecent(current, key, recentCap));
    },
  };
}
