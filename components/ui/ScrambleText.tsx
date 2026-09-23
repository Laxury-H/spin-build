"use client";

import { useEffect, useRef, type ElementType } from "react";
import { prefersReducedMotion } from "@/lib/ui/motion";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%&*+=<>";

export interface ScrambleTextProps {
  text: string;
  /** Change to replay the effect even when `text` is unchanged. */
  trigger?: string | number;
  /** Total decode time in ms. */
  duration?: number;
  /** Delay before decoding starts, in ms. */
  delay?: number;
  as?: ElementType;
  className?: string;
  /** Skip the effect (e.g. first paint). */
  disabled?: boolean;
}

function glyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

/**
 * Text that "decodes" left-to-right through random glyphs. Accessible: the
 * real text is exposed via aria-label; the scrambling frames are aria-hidden.
 * Runs on rAF and writes to the DOM directly (no React re-renders per frame).
 */
export function ScrambleText({
  text,
  trigger,
  duration = 520,
  delay = 0,
  as: Tag = "span",
  className,
  disabled,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (disabled || prefersReducedMotion() || text.length === 0) {
      el.textContent = text;
      return;
    }
    let raf = 0;
    let start = 0;
    const chars = [...text];
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        el.textContent = chars.map((c) => (c === " " ? " " : glyph())).join("");
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const revealed = Math.floor(progress * chars.length);
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        out += i < revealed || c === " " ? c : glyph();
      }
      el.textContent = out;
      if (progress < 1) raf = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, trigger, duration, delay, disabled]);

  return (
    <Tag className={className} aria-label={text}>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
    </Tag>
  );
}
