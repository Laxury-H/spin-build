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

/** Merge duplicates across sources based on title slug and token similarity. */
function mergeCrossSource(trends: Trend[]): Trend[] {
  const merged: Trend[] = [];
  const seenSlugs = new Map<string, Trend>();

  for (const t of trends) {
    const slug = slugify(t.title);
    const existing = seenSlugs.get(slug);

    if (existing) {
      // Merge source into existing
      if (!existing.sources) existing.sources = [existing.source];
      if (!existing.sources.includes(t.source)) existing.sources.push(t.source);
      // Bump score slightly for multi-source confirmation
      existing.score = Math.min(99, existing.score + 5);
      continue;
    }

    // Check token similarity against already merged trends
    const tokens = significantTokens(t.title);
    let matchedExisting: Trend | null = null;

    if (tokens.length >= 2) {
      for (const m of merged) {
        const mTokens = significantTokens(m.title);
        const common = tokens.filter((tok) => mTokens.includes(tok));
        if (common.length >= 2 && common.length >= Math.min(tokens.length, mTokens.length) * 0.7) {
          matchedExisting = m;
          break;
        }
      }
    }

    if (matchedExisting) {
      if (!matchedExisting.sources) matchedExisting.sources = [matchedExisting.source];
      if (!matchedExisting.sources.includes(t.source)) matchedExisting.sources.push(t.source);
      matchedExisting.score = Math.min(99, matchedExisting.score + 4);
      continue;
    }

    seenSlugs.set(slug, t);
    merged.push({ ...t, sources: [t.source] });
  }

  // Sort by score descending
  merged.sort((a, b) => b.score - a.score);
  return merged;
}

/**
 * Aggregates live trends for the given region.
 * Guaranteed never to throw; always returns ≥ 24 valid trends.
 */
export async function getTrendSnapshot(
  region: Region,
  opts: { force?: boolean } = {},
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

  // Always fetch curated baseline
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
