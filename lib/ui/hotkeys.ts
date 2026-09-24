"use client";

import { useEffect, useRef } from "react";

export interface HotkeyMap {
  /**
   * Keys: "space", "r", "1", "escape", "mod+k" (⌘ on macOS, Ctrl elsewhere), "shift+s".
   * Handlers receive the event; call e.preventDefault() yourself if needed.
   */
  [combo: string]: (e: KeyboardEvent) => void;
}

const INTERACTIVE = "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox']";

/** True when a key event should not trigger global shortcuts (typing in a field). */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE);
}

/** True when the event target is a control that already reacts to Space/Enter natively. */
export function isActivatableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest("button, a[href], [role='button'], summary");
}

/** Normalized key name. Falls back to e.code when e.key is empty/unidentified (IMEs, some automation). */
function keyName(e: KeyboardEvent): string {
  if (e.key && e.key !== "Unidentified") return e.key === " " ? "space" : e.key.toLowerCase();
  if (e.code === "Space") return "space";
  if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
  if (e.code.startsWith("Digit")) return e.code.slice(5);
  return e.code.toLowerCase();
}

function comboOf(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  const key = keyName(e);
  parts.push(key);
  return parts.join("+");
}

/**
 * Global keyboard shortcuts. Ignores key presses while typing in fields and
 * while a modal <dialog> is open (except "escape" and "mod+k").
 * Pass `enabled=false` to suspend.
 */
export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const combo = comboOf(e);
      const handler = ref.current[combo];
      if (!handler) return;
      const always = combo === "escape" || combo === "mod+k";
      if (!always) {
        if (isTypingTarget(e.target)) return;
        if (document.querySelector("dialog[open]")) return;
      }
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
