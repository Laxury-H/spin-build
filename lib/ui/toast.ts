import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  /** Optional secondary line, e.g. "LOCKED INTO YOUR NEXT SPIN". */
  detail?: string;
  action?: { label: string; href?: string; onAction?: () => void };
}

interface ToastStore {
  toasts: Toast[];
  push(t: Omit<Toast, "id">, ttlMs?: number): number;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToasts = create<ToastStore>()((set, get) => ({
  toasts: [],
  push(t, ttlMs = 2600) {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismiss(id), ttlMs);
    return id;
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Fire a toast from anywhere (rendered by <Toaster/> in the shell). */
export function toast(message: string, opts: Omit<Toast, "id" | "message"> & { ttlMs?: number } = {}): number {
  const { ttlMs, ...rest } = opts;
  return useToasts.getState().push({ message, ...rest }, ttlMs);
}
