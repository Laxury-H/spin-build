import type { Idea } from "@/types";

/** "2 MIN AGO", "JUST NOW", "3 H AGO", "12 SEP". Uppercase for mono labels. */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "JUST NOW";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} MIN AGO`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} H AGO`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} D AGO`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

/** "PRODUCTIVITY × STUDENTS × MULTIPLAYER × AI AGENTS × HOSTILE UX × NO LOGIN" */
export function dnaLine(idea: Idea, sep = " × "): string {
  const d = idea.dna;
  return [d.domain.short, d.target.short, d.mechanic.short, d.trend.title.toUpperCase(), d.chaos.short, d.constraint.short].join(sep);
}

/** Zero-padded two-digit index: 1 → "01". */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Absolute URL for a share path, using the current origin in the browser. */
export function absoluteUrl(path: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export function ideaPath(idea: Idea): string {
  return `/idea/${idea.code}`;
}
