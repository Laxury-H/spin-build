import { prefersReducedMotion } from "./motion";

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Briefly invert the whole interface (black ↔ white) by toggling
 * html[data-invert], which swaps every design token. Skipped for
 * reduced-motion users (a full-screen flash is jarring).
 */
export function flashInvert(durationMs = 160): void {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  const root = document.documentElement;
  root.setAttribute("data-invert", "");
  clearTimeout(timer);
  timer = setTimeout(() => root.removeAttribute("data-invert"), durationMs);
}
