import type { ProviderHealth, Region, Trend, TrendProvider } from "@/types";
import { cleanTitle, decodeEntities, trendId } from "../text";
import { classifyLiveTitle, isUnsafeTrend } from "../lexicon";

interface RssItem {
  title: string;
  traffic?: string;
  link?: string;
  pubDate?: string;
}

export class SearchTrendProvider implements TrendProvider<string> {
  id = "search" as const;
  name = "Google Trends (Daily Searches)";
  weight = 0.85;
  regions: readonly Region[] = ["GLOBAL", "VN"];

  private lastSuccess = 0;
  private lastError = 0;
  private latencyMs = 0;
  private disabledUntil = 0;
  private failureCount = 0;
  private lastItemCount = 0;

  enabled(): boolean {
    return true; // Keyless public RSS feed
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

  async fetchTrends(ctx: { region: Region; signal: AbortSignal }): Promise<string> {
    const start = Date.now();
    const geo = ctx.region === "VN" ? "VN" : "US";
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;

    try {
      const res = await fetch(url, {
        signal: ctx.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        next: { revalidate: 600 },
      });

      if (!res.ok) {
        throw new Error(`Google Trends HTTP ${res.status} ${res.statusText}`);
      }

      const xml = await res.text();
      this.latencyMs = Date.now() - start;
      this.lastSuccess = Date.now();
      this.failureCount = 0;
      return xml;
    } catch (err) {
      this.lastError = Date.now();
      this.failureCount++;
      if (this.failureCount >= 3) {
        this.disabledUntil = Date.now() + 5 * 60 * 1000;
      }
      throw err;
    }
  }

  normalize(xml: string, ctx: { region: Region; fetchedAt: number }): Trend[] {
    if (!xml || typeof xml !== "string") return [];

    const items: RssItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i.exec(block);
      const rawTitle = titleMatch ? titleMatch[1] || titleMatch[2] : "";

      const trafficMatch = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/i.exec(block);
      const traffic = trafficMatch ? trafficMatch[1] : undefined;

      const linkMatch = /<link>(.*?)<\/link>/i.exec(block);
      const link = linkMatch ? linkMatch[1] : undefined;

      const dateMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(block);
      const pubDate = dateMatch ? dateMatch[1] : undefined;

      if (rawTitle) {
        items.push({
          title: decodeEntities(rawTitle.trim()),
          traffic,
          link,
          pubDate,
        });
      }
    }

    const trends: Trend[] = [];
    const seenTitles = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cleaned = cleanTitle(item.title, { titleCase: true });
      if (!cleaned || cleaned.length < 2 || isUnsafeTrend(cleaned)) continue;

      const lower = cleaned.toLowerCase();
      if (seenTitles.has(lower)) continue;
      seenTitles.add(lower);

      const classified = classifyLiveTitle(cleaned);
      const rankScore = Math.max(50, 95 - i * 2);

      let pubTimestamp = ctx.fetchedAt;
      if (item.pubDate) {
        const parsed = Date.parse(item.pubDate);
        if (!isNaN(parsed)) pubTimestamp = parsed;
      }

      trends.push({
        id: trendId(this.id, cleaned),
        title: cleaned,
        source: this.id,
        category: classified.category,
        score: rankScore,
        url: item.link,
        timestamp: pubTimestamp,
        region: ctx.region,
        tags: classified.tags,
        heat: i < 5 ? "HOT" : i < 12 ? "RISING" : "STEADY",
        angle: classified.angle,
        nameWords: classified.nameWords,
      });
    }

    this.lastItemCount = trends.length;
    return trends;
  }
}
