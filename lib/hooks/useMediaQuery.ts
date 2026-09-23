import { useCallback, useSyncExternalStore } from "react";

/** One MediaQueryList per query string, shared by every subscriber. */
const lists = new Map<string, MediaQueryList>();

function mediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  const cached = lists.get(query);
  if (cached) return cached;
  try {
    const list = window.matchMedia(query);
    lists.set(query, list);
    return list;
  } catch {
    return null;
  }
}

/** Imperative check for non-React code (e.g. inside a rAF loop). `fallback` when unsupported/SSR. */
export function matchesMediaQuery(query: string, fallback = false): boolean {
  return mediaQueryList(query)?.matches ?? fallback;
}

const noop = () => {};

/**
 * Live `matchMedia` result. Returns `serverValue` (default false) on the
 * server and during hydration, then the real value, and re-renders on change.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = mediaQueryList(query);
      if (!list) return noop;
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => matchesMediaQuery(query, serverValue),
    [query, serverValue],
  );
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
