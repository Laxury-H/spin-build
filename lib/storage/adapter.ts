/**
 * Persistence seam. The interface is async on purpose: today it is backed by
 * localStorage (or memory), tomorrow a cloud adapter can drop in without the
 * store or UI changing. See `./sync.ts` for how cloud sync will layer on top.
 */
import type { HistoryEntry, Settings } from "@/types";
import { createLocalAdapter, openBrowserStorage } from "./local";
import { createMemoryAdapter } from "./memory";

export interface StorageAdapter {
  /** Newest first. Corrupt records are dropped, never thrown. */
  getHistory(): Promise<HistoryEntry[]>;
  /** Upsert by id; re-applies ordering and the history cap. */
  putHistory(entry: HistoryEntry): Promise<void>;
  /** Merge `patch` into an existing entry; no-op when the id is unknown. */
  updateHistory(id: string, patch: Partial<HistoryEntry>): Promise<void>;
  removeHistory(id: string): Promise<void>;
  /** `keepSaved` defaults to true — clearing history never deletes saved ideas unless asked. */
  clearHistory(opts?: { keepSaved?: boolean }): Promise<void>;
  /** `null` when nothing (usable) is stored yet. */
  getSettings(): Promise<Settings | null>;
  putSettings(settings: Settings): Promise<void>;
  /** Newest first, unique, capped at 50. */
  getRecentCombos(): Promise<string[]>;
  pushRecentCombo(key: string): Promise<void>;
}

let browserAdapter: StorageAdapter | null = null;

/**
 * The app-wide adapter.
 *
 * - Browser with working localStorage → localStorage adapter (versioned keys).
 * - Browser without it (private mode, disabled, sandboxed iframe) → memory adapter.
 * - Server → a fresh, throwaway memory adapter per call, so nothing can ever
 *   leak between requests. Nothing server-side should rely on it persisting.
 *
 * The browser choice is made once and memoized.
 */
export function getStorage(): StorageAdapter {
  if (typeof window === "undefined") return createMemoryAdapter();
  if (browserAdapter) return browserAdapter;
  const storage = openBrowserStorage();
  browserAdapter = storage ? createLocalAdapter(storage) : createMemoryAdapter();
  return browserAdapter;
}

/** Forget the memoized browser adapter (tests, or after storage availability changes). */
export function resetStorage(): void {
  browserAdapter = null;
}
