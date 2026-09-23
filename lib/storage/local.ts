/**
 * localStorage-backed adapter.
 *
 * Every storage access is wrapped: localStorage can throw on read (SecurityError
 * when site data is blocked), on write (QuotaExceededError, Safari private
 * mode's zero quota), or vanish mid-session. When a write fails the value is
 * held in an in-memory overlay so the rest of the session stays consistent;
 * a later successful write for the same key clears the overlay.
 *
 * Nothing here touches `window` at import time.
 */
import type { StorageAdapter } from "./adapter";
import { createKeyValueAdapter, type KeyValueAdapterOptions, type KeyValueBackend } from "./kv";
import { STORAGE_NAMESPACE, type StorageKey } from "./schema";

/** The subset of the Web Storage API we use (lets tests pass a plain object). */
export type WebStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isQuotaError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const name = "name" in err ? err.name : undefined;
  const code = "code" in err ? err.code : undefined;
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" || // Firefox
    code === 22 ||
    code === 1014
  );
}

function isWebStorage(value: unknown): value is WebStorageLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "getItem" in value &&
    typeof value.getItem === "function" &&
    "setItem" in value &&
    typeof value.setItem === "function" &&
    "removeItem" in value &&
    typeof value.removeItem === "function"
  );
}

/**
 * The browser's localStorage if it is present and writable, else `null`.
 *
 * - Returns `null` on the server without touching `globalThis.localStorage`
 *   (Node ≥ 22 exposes a half-configured global that warns on access).
 * - A *full* storage (quota error on the probe) is still returned: existing
 *   data is readable and writes degrade to memory gracefully.
 */
export function openBrowserStorage(): WebStorageLike | null {
  if (typeof window === "undefined") return null;
  let storage: unknown;
  try {
    storage = globalThis.localStorage;
  } catch {
    return null; // SecurityError: storage blocked for this origin
  }
  if (!isWebStorage(storage)) return null;
  const probe = `${STORAGE_NAMESPACE}:probe`;
  try {
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch (err) {
    return isQuotaError(err) ? storage : null;
  }
}

function createWebStorageBackend(storage: WebStorageLike): KeyValueBackend {
  /** Values we failed to persist; authoritative while present. */
  const overlay = new Map<StorageKey, string | null>();
  /** Last value successfully read per key, served if storage becomes unreadable mid-session. */
  const lastRead = new Map<StorageKey, string | null>();
  let readable = true;

  return {
    read(key) {
      if (overlay.has(key)) return overlay.get(key) ?? null;
      if (readable) {
        try {
          const value = storage.getItem(key);
          lastRead.set(key, value);
          return value;
        } catch {
          readable = false; // storage revoked mid-session
        }
      }
      return lastRead.get(key) ?? null;
    },
    write(key, value) {
      try {
        storage.setItem(key, value);
        overlay.delete(key);
        return "ok";
      } catch (err) {
        overlay.set(key, value);
        return isQuotaError(err) ? "quota" : "error";
      }
    },
    remove(key) {
      try {
        storage.removeItem(key);
        overlay.delete(key);
      } catch {
        overlay.set(key, null);
      }
    },
  };
}

export function createLocalAdapter(
  storage: WebStorageLike,
  options?: KeyValueAdapterOptions,
): StorageAdapter {
  return createKeyValueAdapter(createWebStorageBackend(storage), options);
}
