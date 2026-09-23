import { describe, it, expect } from "vitest";
import { classifyLiveTitle, isUnsafeTrend } from "./lexicon";
import { TechTrendProvider } from "./providers/tech";
import { SearchTrendProvider } from "./providers/search";
import { getTrendSnapshot } from "./engine";

describe("Live Trends Lexicon & Safety", () => {
  it("classifies AI and LLM trends accurately", () => {
    const res = classifyLiveTitle("OpenAI launches GPT-5 with real-time reasoning agent");
    expect(res.category).toBe("AI");
    expect(res.nameWords.length).toBeGreaterThan(0);
    expect(res.relevance).toBeGreaterThanOrEqual(0.8);
    expect(res.angle).toBeTruthy();
  });

  it("classifies Tech & Framework trends", () => {
    const res = classifyLiveTitle("React 19 Server Components and Rust Tooling");
    expect(res.category).toBe("TECH");
  });

  it("filters unsafe / disaster / tragic trends", () => {
    expect(isUnsafeTrend("Plane crash kills 100 in tragedy")).toBe(true);
    expect(isUnsafeTrend("Horrific murder trial verdict announced")).toBe(true);
    expect(isUnsafeTrend("Show HN: Fast local SQLite vector search in TypeScript")).toBe(false);
  });
});

describe("Tech Trend Provider (Hacker News Algolia)", () => {
  const provider = new TechTrendProvider();

  it("is enabled by default (keyless public API)", () => {
    expect(provider.enabled()).toBe(true);
    expect(provider.id).toBe("tech");
  });

  it("normalizes HN raw hits into valid Trend objects", () => {
    const rawResponse = {
      hits: [
        {
          objectID: "123456",
          title: "Show HN: Local Claude Opus Coding Agent",
          url: "https://example.com/agent",
          points: 450,
          created_at_i: 1790090000,
        },
        {
          objectID: "999999",
          title: "Tragic disaster and death toll rises", // unsafe
          url: "https://example.com/bad",
          points: 10,
          created_at_i: 1790090000,
        },
      ],
    };

    const trends = provider.normalize(rawResponse, { region: "GLOBAL", fetchedAt: Date.now() });
    expect(trends.length).toBe(1);
    expect(trends[0].title).toBe("Local Claude Opus Coding Agent");
    expect(trends[0].category).toBe("AI");
    expect(trends[0].source).toBe("tech");
    expect(trends[0].score).toBeGreaterThan(80);
  });
});

describe("Search Trend Provider (Google Trends RSS)", () => {
  const provider = new SearchTrendProvider();

  it("is enabled by default and supports GLOBAL and VN", () => {
    expect(provider.enabled()).toBe(true);
    expect(provider.regions).toContain("GLOBAL");
    expect(provider.regions).toContain("VN");
  });

  it("normalizes Google Trends XML items", () => {
    const rawXml = `
      <rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
        <channel>
          <title>Daily Search Trends</title>
          <item>
            <title>Trí tuệ nhân tạo Gemini 2</title>
            <ht:approx_traffic>200,000+</ht:approx_traffic>
            <link>https://trends.google.com</link>
            <pubDate>Wed, 23 Sep 2026 12:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const trends = provider.normalize(rawXml, { region: "VN", fetchedAt: Date.now() });
    expect(trends.length).toBe(1);
    expect(trends[0].title).toBe("Trí Tuệ Nhân Tạo Gemini 2");
    expect(trends[0].source).toBe("search");
    expect(trends[0].category).toBe("AI");
  });
});

describe("Trend Aggregation Engine", () => {
  it("aggregates trends and guarantees a minimum set with fallback resilience", async () => {
    const snapshot = await getTrendSnapshot("GLOBAL", { force: true });
    expect(snapshot.region).toBe("GLOBAL");
    expect(snapshot.trends.length).toBeGreaterThanOrEqual(24);
    expect(["ONLINE", "PARTIAL", "OFFLINE_CACHE"]).toContain(snapshot.status);
    expect(snapshot.providers.length).toBeGreaterThan(0);
  });
});
