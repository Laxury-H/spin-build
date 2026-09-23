/**
 * Pure list operations shared by every StorageAdapter and by the store, so the
 * in-memory state and the persisted copy always apply identical rules:
 *
 *   - history is ordered newest first (by `timestamp`, ties keep insertion order)
 *   - ids are unique; writes are upserts
 *   - at most HISTORY_CAP entries, evicting the oldest *unsaved* ones first —
 *     saved entries are never evicted
 *   - recent comboKeys are unique, newest first, capped at RECENT_CAP
 *
 * Every function returns a new array and never mutates its inputs.
 */
import type { HistoryEntry } from "@/types";
import { HISTORY_CAP, RECENT_CAP } from "./schema";

/** Enforce the cap on a newest-first list: all saved entries stay, the newest unsaved fill the rest. */
export function capHistory(
  entries: readonly HistoryEntry[],
  cap: number = HISTORY_CAP,
): HistoryEntry[] {
  if (entries.length <= cap) return entries.slice();
  const savedCount = entries.reduce((n, e) => n + (e.saved ? 1 : 0), 0);
  let unsavedBudget = Math.max(0, cap - savedCount);
  return entries.filter((e) => {
    if (e.saved) return true;
    if (unsavedBudget > 0) {
      unsavedBudget--;
      return true;
    }
    return false;
  });
}

/** Insert or replace `entry` (by id) at its timestamp position, then cap. */
export function upsertHistory(
  entries: readonly HistoryEntry[],
  entry: HistoryEntry,
  cap: number = HISTORY_CAP,
): HistoryEntry[] {
  const rest = entries.filter((e) => e.id !== entry.id);
  const at = rest.findIndex((e) => e.timestamp <= entry.timestamp);
  if (at === -1) rest.push(entry);
  else rest.splice(at, 0, entry);
  return capHistory(rest, cap);
}

/** Apply a patch to one entry. Ids are immutable; a changed timestamp re-positions the entry. */
export function patchHistory(
  entries: readonly HistoryEntry[],
  id: string,
  patch: Partial<HistoryEntry>,
  cap: number = HISTORY_CAP,
): HistoryEntry[] {
  const current = entries.find((e) => e.id === id);
  if (!current) return entries.slice();
  const next: HistoryEntry = { ...current, ...patch, id };
  if (next.timestamp !== current.timestamp) return upsertHistory(entries, next, cap);
  return capHistory(
    entries.map((e) => (e.id === id ? next : e)),
    cap,
  );
}

export function removeFromHistory(entries: readonly HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((e) => e.id !== id);
}

export function clearHistoryList(
  entries: readonly HistoryEntry[],
  keepSaved: boolean = true,
): HistoryEntry[] {
  return keepSaved ? entries.filter((e) => e.saved) : [];
}

/**
 * Union two histories by id. On a clash `primary` wins, except that a saved
 * flag on either side survives (saving is the one action we never silently undo).
 */
export function mergeHistoryLists(
  primary: readonly HistoryEntry[],
  secondary: readonly HistoryEntry[],
  cap: number = HISTORY_CAP,
): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of secondary) byId.set(e.id, e);
  for (const e of primary) {
    const other = byId.get(e.id);
    byId.set(e.id, other && other.saved && !e.saved ? { ...e, saved: true } : e);
  }
  const merged = [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
  return capHistory(merged, cap);
}

/** Drop the older half of the unsaved entries (used to shrink a payload that hit the storage quota). */
export function shedUnsaved(entries: readonly HistoryEntry[]): HistoryEntry[] {
  const unsaved = entries.filter((e) => !e.saved).length;
  if (unsaved === 0) return entries.slice();
  return capHistory(entries, entries.length - Math.ceil(unsaved / 2));
}

export function pushRecent(
  recent: readonly string[],
  key: string,
  cap: number = RECENT_CAP,
): string[] {
  return [key, ...recent.filter((k) => k !== key)].slice(0, cap);
}

/** Union of two newest-first recent lists, `primary` first. */
export function mergeRecent(
  primary: readonly string[],
  secondary: readonly string[],
  cap: number = RECENT_CAP,
): string[] {
  const out: string[] = [];
  for (const key of [...primary, ...secondary]) {
    if (!out.includes(key)) out.push(key);
    if (out.length >= cap) break;
  }
  return out;
}
