import { create } from "zustand";

/**
 * Open-state for the idea overlays, shared so keyboard shortcuts in the lab
 * (B = build brief, M = mutate, Shift+S = share) and buttons inside
 * <IdeaResult> drive the same dialogs. `palette` is the ⌘K command palette.
 */
export type OverlayName = "brief" | "share" | "mutate" | "palette";

interface OverlayStore {
  open: OverlayName | null;
  show(name: OverlayName): void;
  hide(name?: OverlayName): void;
  toggle(name: OverlayName): void;
}

export const useOverlay = create<OverlayStore>()((set, get) => ({
  open: null,
  show(name) {
    set({ open: name });
  },
  hide(name) {
    if (!name || get().open === name) set({ open: null });
  },
  toggle(name) {
    set({ open: get().open === name ? null : name });
  },
}));
