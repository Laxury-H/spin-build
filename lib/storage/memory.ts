/**
 * In-memory adapter: the fallback when localStorage is unavailable, the server
 * stand-in, and the adapter tests inject. Values are stored serialized, so
 * callers can never mutate persisted state by reference and the validation /
 * cap rules are exactly those of the localStorage adapter.
 */
import type { StorageAdapter } from "./adapter";
import { createKeyValueAdapter, type KeyValueAdapterOptions, type KeyValueBackend } from "./kv";
import type { StorageKey } from "./schema";

export function createMemoryAdapter(options?: KeyValueAdapterOptions): StorageAdapter {
  const values = new Map<StorageKey, string>();
  const backend: KeyValueBackend = {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
      return "ok";
    },
    remove: (key) => {
      values.delete(key);
    },
  };
  return createKeyValueAdapter(backend, options);
}
