import type { Region, TrendSnapshot } from "@/types";
import { FALLBACK_TRENDS } from "@/data";

/** Browser-safe fallback snapshot. Pure and instantaneous. */
export function fallbackSnapshot(region: Region): TrendSnapshot {
  return {
    region,
    status: "OFFLINE_CACHE",
    trends: FALLBACK_TRENDS.filter((t) => t.region === region || t.region === "GLOBAL"),
    providers: [],
    fetchedAt: Date.now(),
  };
}

/**
 * Client-side fetcher for the live aggregated trend snapshot.
 * Calls `/api/trends?region=...` with timeout and signal support.
 */
export async function fetchTrendSnapshot(
  region: Region,
  opts: { signal?: AbortSignal; timeoutMs?: number; force?: boolean } = {},
): Promise<TrendSnapshot | null> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Link external signal if provided
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const url = `/api/trends?region=${encodeURIComponent(region)}${opts.force ? "&force=true" : ""}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as TrendSnapshot;
    if (data && Array.isArray(data.trends) && data.trends.length > 0) {
      return data;
    }
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Fetches a random humor/tech spark to bias chaos modifiers.
 */
export async function fetchSpark(): Promise<{ text: string; tags: string[] } | null> {
  try {
    const res = await fetch("/api/spark", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.text === "string" && Array.isArray(data.tags)) {
      return data;
    }
  } catch {
    // Ignore error
  }
  return null;
}
