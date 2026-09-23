import { FALLBACK_TRENDS } from "@/data";
import type { ProviderHealth, Region, Trend, TrendProvider } from "@/types";

export class CuratedTrendProvider implements TrendProvider<Trend[]> {
  id = "curated" as const;
  name = "Curated Cultural Baseline";
  weight = 0.7;
  regions: readonly Region[] = ["GLOBAL", "VN"];

  enabled(): boolean {
    return true;
  }

  health(): ProviderHealth {
    return {
      id: this.id,
      name: this.name,
      state: "ok",
      count: FALLBACK_TRENDS.length,
    };
  }

  async fetchTrends(_ctx: { region: Region; signal: AbortSignal }): Promise<Trend[]> {
    return FALLBACK_TRENDS;
  }

  normalize(raw: Trend[], ctx: { region: Region }): Trend[] {
    return raw.filter((t) => t.region === ctx.region || t.region === "GLOBAL");
  }
}
