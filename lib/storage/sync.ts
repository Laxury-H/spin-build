/**
 * Cloud sync seam — designed, not wired.
 *
 * The local StorageAdapter stays the source of truth for the UI: every action
 * writes locally first (instant, offline-safe), and a SyncAdapter reconciles
 * with a remote in the background. Nothing in the app calls sync yet; the
 * no-op implementation below is what a future `getSync()` returns when the
 * user is signed out.
 *
 * ── Data model ───────────────────────────────────────────────────────────────
 * Everything crosses the wire as a `SyncRecord`: `{ id, updatedAt, deleted, value }`.
 *   - History: one record per HistoryEntry, `id` = entry id (= idea code, which
 *     is globally unique and deterministic, so the same idea on two devices
 *     is the same record).
 *   - Settings: a single record with id `"settings"`.
 * `updatedAt` is a *modification* clock, distinct from HistoryEntry.timestamp
 * (which is "when it was generated/recorded" and drives display order).
 * When sync ships, the local adapter keeps `updatedAt` stamps and deletion
 * tombstones in a sidecar key (`spinbuild:v1:sync-meta`) so the persisted
 * HistoryEntry shape — and every existing localStorage record — stays valid.
 *
 * ── Merge strategy: last-writer-wins per record, by timestamp ────────────────
 *   1. `pull(cursor)` returns remote records changed since the last cursor.
 *   2. For each id, `mergeRecords` keeps the record with the newer `updatedAt`.
 *      Ties go to the tombstone (a deletion is always deliberate), then to the
 *      remote copy (the server is the tie-break authority so all devices converge).
 *   3. Merged history is re-sorted by `timestamp` and re-capped with the normal
 *      rules (saved entries are never evicted), then written locally.
 *   4. Local records newer than the remote are sent with `push`, which returns
 *      the next cursor. Tombstones are pruned once the server has acknowledged
 *      them and they are older than the history cap window.
 * Clock skew is bounded by stamping `updatedAt` with `max(Date.now(), last
 * seen remote updatedAt + 1)`, so a device with a slow clock cannot lose every
 * conflict forever.
 *
 * Recent comboKeys are device-local by design (they tune one device's
 * repeat-avoidance) and are never synced.
 */
import type { HistoryEntry, Settings } from "@/types";

export interface SyncRecord<T> {
  id: string;
  /** Epoch ms of the last modification (not creation). */
  updatedAt: number;
  /** Tombstone: the record was deleted at `updatedAt`. `value` is then null. */
  deleted: boolean;
  value: T | null;
}

export interface SyncBatch {
  history: SyncRecord<HistoryEntry>[];
  settings: SyncRecord<Settings> | null;
  /** Opaque server cursor; `null` = from the beginning. */
  cursor: string | null;
}

export interface SyncAdapter {
  /** Stable identifier for diagnostics, e.g. "none", "supabase". */
  readonly id: string;
  /** False when signed out / not configured; callers skip sync entirely. */
  isEnabled(): boolean;
  /** Remote changes since `cursor`. Must never throw for "no changes"; network errors reject. */
  pull(cursor: string | null, signal?: AbortSignal): Promise<SyncBatch>;
  /** Send local changes; resolves with the cursor to use for the next pull. */
  push(batch: SyncBatch, signal?: AbortSignal): Promise<{ cursor: string | null }>;
}

/** Sync disabled: pulls nothing, accepts and discards pushes. */
export const noopSync: SyncAdapter = {
  id: "none",
  isEnabled: () => false,
  pull: async (cursor) => ({ history: [], settings: null, cursor }),
  push: async (batch) => ({ cursor: batch.cursor }),
};

/**
 * Last-writer-wins merge of two record sets (see strategy above). Pure; the
 * result contains every id from either side, tombstones included, ordered by
 * `updatedAt` descending.
 */
export function mergeRecords<T>(
  local: readonly SyncRecord<T>[],
  remote: readonly SyncRecord<T>[],
): SyncRecord<T>[] {
  const merged = new Map<string, SyncRecord<T>>();
  for (const record of local) merged.set(record.id, record);
  for (const record of remote) {
    const mine = merged.get(record.id);
    if (!mine || prefersIncoming(mine, record)) merged.set(record.id, record);
  }
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function prefersIncoming<T>(current: SyncRecord<T>, incoming: SyncRecord<T>): boolean {
  if (incoming.updatedAt !== current.updatedAt) return incoming.updatedAt > current.updatedAt;
  if (incoming.deleted !== current.deleted) return incoming.deleted;
  return true;
}
