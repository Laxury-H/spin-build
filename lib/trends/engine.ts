import "server-only";

import type { Region, Trend, TrendEngineStatus, TrendProvider, TrendSnapshot } from "@/types";
import { TechTrendProvider } from "./providers/tech";
import { SearchTrendProvider } from "./providers/search";
import { CuratedTrendProvider } from "./providers/curated";
import { significantTokens, slugify } from "./text";

interface CacheEntry {
  snapshot: TrendSnapshot;
  cachedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh
const STALE_TTL_MS = 60 * 60 * 1000; // 60 minutes stale-while-revalidate

const cache = new Map<Region, CacheEntry>();

const techProvider = new TechTrendProvider();
const searchProvider = new SearchTrendProvider();
const curatedProvider = new CuratedTrendProvider();

const LIVE_PROVIDERS: TrendProvider[] = [techProvider, searchProvider];

const heatRank = { HOT: 3, RISING: 2, STEADY: 1 } as const;

/** Merge duplicates across sources based on title slug and token similarity. */
function mergeCrossSource(trends: Trend[]): Trend[] {
  const merged: Trend[] = [];

  for (const t of trends) {
    const slug = slugify(t.title);
    const tokens = significantTokens(t.title);

    let matchIdx = -1;
    for (let i = 0; i < merged.length; i++) {
      const existing = merged[i];
      if (slugify(existing.title) === slug) {
        matchIdx = i;
        break;
      }
      const existingTokens = significantTokens(existing.title);
      const overlap = tokens.filter((tok) => existingTokens.includes(tok));
      if (overlap.length >= 2 && overlap.length / Math.min(tokens.length, existingTokens.length) > 0.6) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      const existing = merged[matchIdx];
      const combinedScore = Math.min(100, existing.score + t.score * 0.4);
      const sources = Array.from(new Set([...(existing.sources ?? [existing.source]), ...(t.sources ?? [t.source])]));
      const r1 = existing.heat ? heatRank[existing.heat] ?? 1 : 1;
      const r2 = t.heat ? heatRank[t.heat] ?? 1 : 1;
      const maxRank = Math.max(r1, r2);
      const heat: "HOT" | "RISING" | "STEADY" = maxRank === 3 ? "HOT" : maxRank === 2 ? "RISING" : "STEADY";

      merged[matchIdx] = {
        ...existing,
        score: Math.round(combinedScore),
        sources,
        heat,
      };
    } else {
      merged.push({ ...t, sources: [t.source] });
    }
  }

  // Sort descending by score
  merged.sort((a, b) => b.score - a.score);
  return merged;
}

/**
 * Fetch a unified snapshot for a given region.
 * Uses cached data if fresh; falls back to curated baseline if live sources fail.
 */
export async function fetchSnapshot(
  region: Region,
  opts: { force?: boolean } = {}
): Promise<TrendSnapshot> {
  const now = Date.now();
  const cached = cache.get(region);

  // Return fresh cache if available and not forced
  if (!opts.force && cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const fetchedAt = now;
  const timeoutMs = 4000;

  // Fetch from live providers concurrently with individual timeouts
  const providerPromises = LIVE_PROVIDERS.map(async (provider) => {
    if (!provider.enabled()) return { provider, items: [] as Trend[], error: "DISABLED" };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const raw = await provider.fetchTrends({ region, signal: controller.signal });
      clearTimeout(timeout);
      const items = provider.normalize(raw, { region, fetchedAt });
      return { provider, items, error: null };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      return { provider, items: [] as Trend[], error: msg };
    }
  });

  const curatedPromise = (async () => {
    try {
      const raw = await curatedProvider.fetchTrends({ region, signal: new AbortController().signal });
      return curatedProvider.normalize(raw, { region });
    } catch {
      return [];
    }
  })();

  const [providerResults, curatedItems] = await Promise.all([
    Promise.allSettled(providerPromises),
    curatedPromise,
  ]);

  let liveSuccessCount = 0;
  const allLiveTrends: Trend[] = [];

  for (const res of providerResults) {
    if (res.status === "fulfilled" && res.value.error === null && res.value.items.length > 0) {
      liveSuccessCount++;
      allLiveTrends.push(...res.value.items);
    }
  }

  // Fallback to stale cache if all live providers fail but cache is within stale TTL
  if (liveSuccessCount === 0 && cached && now - cached.cachedAt < STALE_TTL_MS) {
    return {
      ...cached.snapshot,
      status: "OFFLINE_CACHE",
    };
  }

  // Deduplicate and rank live trends
  const mergedLive = mergeCrossSource(allLiveTrends);

  // Combine with curated baseline: live trends first, then curated to reach ≥ 24 items
  const finalTrends = [...mergedLive];
  const seenIds = new Set(finalTrends.map((t) => slugify(t.title)));

  for (const c of curatedItems) {
    const slug = slugify(c.title);
    if (!seenIds.has(slug)) {
      seenIds.add(slug);
      finalTrends.push(c);
    }
  }

  // Derive engine status
  let status: TrendEngineStatus = "OFFLINE_CACHE";
  if (liveSuccessCount >= 2) status = "ONLINE";
  else if (liveSuccessCount === 1) status = "PARTIAL";

  const providersHealth = [
    techProvider.health(),
    searchProvider.health(),
    curatedProvider.health(),
  ];

  const snapshot: TrendSnapshot = {
    region,
    status,
    trends: finalTrends,
    providers: providersHealth,
    fetchedAt,
  };

  cache.set(region, { snapshot, cachedAt: now });
  return snapshot;
}

export const getTrendSnapshot = fetchSnapshot;
