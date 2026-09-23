/**
 * Typed selectors for `useSpin`.
 *
 * zustand v5 compares selector results with Object.is, so a selector must
 * return a primitive or an existing reference — never a freshly built
 * array/object (that re-renders forever). The hooks below wrap derived
 * collections in `useShallow` for that reason.
 */
import { useShallow } from "zustand/react/shallow";
import { sectorPosition } from "@/data/sectors";
import type { DnaKey, HistoryEntry, Settings } from "@/types";
import { useSpin, type SpinStore } from "./spin-store";

export const selectIsSpinning = (s: SpinStore): boolean => s.phase === "spinning";

/** Result is on screen (or being revealed): SAVE/BUILD/MUTATE make sense. */
export const selectHasResult = (s: SpinStore): boolean =>
  s.current !== null && (s.phase === "result" || s.phase === "revealing");

/** 0-based wheel index the wheel should land on, from `targetSector`. */
export const selectTargetIndex = (s: SpinStore): number | null =>
  s.targetSector ? sectorPosition(s.targetSector) : null;

export const selectIsLocked =
  (key: DnaKey) =>
  (s: SpinStore): boolean =>
    s.locks.includes(key);

export const selectIsSaved =
  (id: string | null | undefined) =>
  (s: SpinStore): boolean =>
    id != null && s.history.some((e) => e.id === id && e.saved);

export const selectCurrentIsSaved = (s: SpinStore): boolean => {
  const current = s.current;
  return current !== null && s.history.some((e) => e.id === current.id && e.saved);
};

export const selectSavedCount = (s: SpinStore): number =>
  s.history.reduce((n, e) => n + (e.saved ? 1 : 0), 0);

/** Saved entries, newest first. Stable between unrelated store updates. */
export function useSavedEntries(): HistoryEntry[] {
  return useSpin(useShallow((s: SpinStore) => s.history.filter((e) => e.saved)));
}

/** The persisted settings triple. Stable between unrelated store updates. */
export function useSettings(): Settings {
  return useSpin(useShallow((s: SpinStore) => ({ chaos: s.chaos, region: s.region, audio: s.audio })));
}

/** Imperative access for non-React code (hotkeys, audio, the command palette). */
export const getSpinState = (): SpinStore => useSpin.getState();
