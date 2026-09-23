import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * `false` on the server and during the hydration render, `true` afterwards.
 *
 * Use it to gate client-only output (localStorage-derived counts, dates in the
 * viewer's timezone) without a hydration mismatch. Built on
 * useSyncExternalStore rather than a mount effect, so components mounted
 * *after* hydration (client navigation) get `true` on their first render
 * instead of flashing the server fallback.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
