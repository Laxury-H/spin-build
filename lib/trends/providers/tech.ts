import type { ProviderHealth, Region, Trend, TrendProvider } from "@/types";
import { cleanTitle, trendId } from "../text";
import { classifyLiveTitle, isUnsafeTrend } from "../lexicon";

interface HnHit {
  title?: string;
  url?: string;
  points?: number;
  created_at_i?: number;
  objectID?: string;
}

interface HnResponse {
  hits?: HnHit[];
}

export class TechTrendProvider implements TrendProvider<HnResponse> {
  id = "tech" as const;
  name = "Hacker News (Tech & AI)";
  weight = 0.95;
  regions: readonly Region[] = ["GLOBAL", "VN"];

  private lastSuccess = 0;
  private lastError = 0;
  private latencyMs = 0;
  private disabledUntil = 0;
  private failureCount = 0;
  private lastItemCount = 0;

  enabled(): boolean {
    return true; // Keyless public API
  }

  health(): ProviderHealth {
    const now = Date.now();
    let state: ProviderHealth["state"] = "ok";
    if (this.disabledUntil > now) state = "disabled";
    else if (this.failureCount >= 3) state = "down";
    else if (this.failureCount > 0) state = "degraded";

    return {
      id: this.id,
      name: this.name,
      state,
      lastSuccess: this.lastSuccess || undefined,
      lastError: this.lastError || undefined,
      disabledUntil: this.disabledUntil || undefined,
      latencyMs: this.latencyMs,
      count: this.lastItemCount,
    };
  }

  async fetchTrends(ctx: { region: Region; signal: AbortSignal }): Promise<HnResponse> {
    const start = Date.now();
    try {
      const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=35", {
        signal: ctx.signal,
        headers: { Accept: "application/json" },
        next: { revalidate: 600 },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as HnResponse;
      this.latencyMs = Date.now() - start;
      this.lastSuccess = Date.now();
      this.failureCount = 0;
      return data;
    } catch (err) {
      this.lastError = Date.now();
      this.failureCount++;
      if (this.failureCount >= 3) {
        // Circuit breaker: back off for 5 minutes
        this.disabledUntil = Date.now() + 5 * 60 * 1000;
      }
      throw err;
    }
  }

  normalize(raw: HnResponse, ctx: { region: Region; fetchedAt: number }): Trend[] {
    if (!raw.hits || !Array.isArray(raw.hits)) return [];

    const trends: Trend[] = [];
    const seenTitles = new Set<string>();

    for (let i = 0; i < raw.hits.length; i++) {
      const hit = raw.hits[i];
      if (!hit?.title) continue;

      const cleaned = cleanTitle(hit.title, { hackerNews: true });
      if (!cleaned || cleaned.length < 3 || isUnsafeTrend(cleaned)) continue;

      const lower = cleaned.toLowerCase();
      if (seenTitles.has(lower)) continue;
      seenTitles.add(lower);

      const classified = classifyLiveTitle(cleaned);
      const points = typeof hit.points === "number" ? hit.points : 50;
      // Score scaled from rank & points (50..98)
      const rankPenalty = Math.min(25, i * 1.2);
      const pointsBonus = Math.min(20, Math.floor(Math.log10(Math.max(10, points)) * 10));
      const score = Math.max(45, Math.min(98, Math.round(80 - rankPenalty + pointsBonus)));

      trends.push({
        id: trendId(this.id, cleaned),
        title: cleaned,
        source: this.id,
        category: classified.category,
        score,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        timestamp: hit.created_at_i ? hit.created_at_i * 1000 : ctx.fetchedAt,
        region: ctx.region,
        tags: classified.tags,
        heat: i < 5 ? "HOT" : i < 15 ? "RISING" : "STEADY",
        angle: classified.angle,
        nameWords: classified.nameWords,
      });
    }

    this.lastItemCount = trends.length;
    return trends;
  }
}
