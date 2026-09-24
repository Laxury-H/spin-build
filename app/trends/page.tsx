"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/ui/cn";
import { timeAgo } from "@/lib/ui/format";
import { Button } from "@/components/ui/Button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { RegionToggle, TrendEngineStatus } from "@/components/shell/controls";
import { TREND_SOURCE_LABEL, type Trend, type TrendCategory } from "@/types";

const CATEGORY_VI: Partial<Record<TrendCategory, string>> = {
  AI: "AI",
  TECH: "Công nghệ",
  CULTURE: "Văn hóa",
  MEME: "Meme",
  VIDEO: "Video",
  MUSIC: "Âm nhạc",
  FINANCE: "Tài chính",
  GAMING: "Game",
  LIFESTYLE: "Lối sống",
  SPORTS: "Thể thao",
  SCIENCE: "Khoa học",
  DESIGN: "Thiết kế",
  NEWS: "Tin tức",
  OTHER: "Khác",
};

const HEAT: Record<NonNullable<Trend["heat"]>, string> = {
  HOT: "↑ Nóng",
  RISING: "↗ Đang lên",
  STEADY: "→ Ổn định",
};

const STATE_VI: Record<string, string> = { ok: "OK", degraded: "Chập chờn", down: "Lỗi", disabled: "Tắt" };

export default function TrendsPage() {
  const router = useRouter();
  const snapshot = useSpin((s) => s.trends);
  const trendSync = useSpin((s) => s.trendSync);
  const refreshTrends = useSpin((s) => s.refreshTrends);
  const region = useSpin((s) => s.region);
  const injectTrend = useSpin((s) => s.injectTrend);
  const injectedTrend = useSpin((s) => s.injectedTrend);

  const hydrated = useHydrated();
  const [category, setCategory] = useState<"ALL" | TrendCategory>("ALL");
  const [query, setQuery] = useState("");

  const all = snapshot.trends;
  const categories = useMemo(() => {
    const seen = new Set(all.map((t) => t.category));
    return (Object.keys(CATEGORY_VI) as TrendCategory[]).filter((c) => seen.has(c));
  }, [all]);

  const q = query.trim().toLowerCase();
  const items = all.filter(
    (t) =>
      (category === "ALL" || t.category === category) &&
      (!q || t.title.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q))),
  );

  const liveProviders = snapshot.providers.filter((p) => p.id !== "curated");
  const okCount = liveProviders.filter((p) => p.state === "ok").length;
  const syncing = trendSync === "syncing";

  const inject = (t: Trend) => {
    injectTrend(t);
    toast(`Đã chọn // ${t.title.toUpperCase()}`, {
      detail: "Xu hướng này sẽ vào lần quay tới",
      action: { label: "Quay ngay →", onAction: () => router.push("/") },
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-8">
        <h1 className="display text-[clamp(2.6rem,7vw,6.5rem)]">
          Internet đang
          <br />
          ám ảnh điều gì.
        </h1>

        <div className="flex flex-col gap-4 border-y border-line py-3 md:flex-row md:items-center md:justify-between">
          <p className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
            <TrendEngineStatus />
            <span>
              {okCount}/{liveProviders.length} nguồn live
            </span>
            <span>{!hydrated ? " " : snapshot.fetchedAt ? `Cập nhật ${timeAgo(snapshot.fetchedAt)}` : "Dữ liệu tuyển chọn"}</span>
          </p>
          <div className="flex items-center gap-3">
            <RegionToggle />
            <Button size="sm" onClick={() => refreshTrends({ force: true })} disabled={syncing}>
              {syncing ? "Đang tải…" : "Làm mới"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar -mx-4 flex min-w-0 flex-1 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Lọc theo chủ đề">
          {(["ALL", ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                "label h-8 shrink-0 border border-line px-3 transition-colors [&:not(:first-child)]:-ml-px",
                category === c ? "relative z-10 border-fg bg-fg text-bg" : "text-muted hover:text-fg",
              )}
            >
              {c === "ALL" ? "Tất cả" : CATEGORY_VI[c]}
              <span className="ml-1.5 opacity-50">{c === "ALL" ? all.length : all.filter((t) => t.category === c).length}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm xu hướng"
          aria-label="Tìm xu hướng"
          className="label h-8 w-full border border-line bg-transparent px-3 text-fg outline-none placeholder:text-subtle focus:border-fg md:w-64 md:shrink-0"
        />
      </div>

      {items.length === 0 ? (
        <p className="label border-y border-line py-16 text-center text-muted">Không có xu hướng nào khớp.</p>
      ) : (
        <ol className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t, i) => {
            const injected = injectedTrend?.id === t.id;
            const sources = (t.sources?.length ? t.sources : [t.source]).map((s) => TREND_SOURCE_LABEL[s]);
            return (
              <li
                key={t.id}
                className="enter flex min-h-64 flex-col justify-between gap-6 bg-bg p-5"
                style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}
              >
                <div className="flex flex-col gap-4">
                  <div className="label flex items-start justify-between text-muted">
                    <span className="font-mono text-2xl leading-none tracking-[-0.02em] text-fg">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={t.heat === "HOT" ? "text-fg" : undefined}>{HEAT[t.heat ?? "STEADY"]}</span>
                  </div>
                  <h2 className="text-xl font-semibold uppercase leading-tight tracking-[-0.01em]">{t.title}</h2>
                  <div className="flex flex-col gap-1">
                    <span className="label text-muted">{CATEGORY_VI[t.category] ?? t.category}</span>
                    <span className="label text-subtle">Thấy ở: {sources.join(" / ")}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label flex items-center gap-1 self-start text-muted hover:text-fg"
                    >
                      Nguồn <ArrowUpRightIcon className="h-3 w-3" />
                    </a>
                  )}
                  <Button size="sm" variant="outline" pressed={injected} onClick={() => inject(t)} className="w-full">
                    {injected ? "Đã chọn cho lần quay tới" : "[ Đưa vào vòng quay ]"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="sources-title">
        <h2 id="sources-title" className="label text-muted">
          Nguồn dữ liệu
        </h2>
        <div className="overflow-x-auto">
          <table className="label w-full min-w-[560px] border-t border-line text-left">
            <thead className="text-subtle">
              <tr className="border-b border-line">
                <th className="py-2 font-normal">Nguồn</th>
                <th className="py-2 font-normal">Trạng thái</th>
                <th className="py-2 font-normal">Ghi chú</th>
                <th className="py-2 text-right font-normal">Số mục</th>
                <th className="py-2 text-right font-normal">Độ trễ</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.providers.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-2 text-fg">{p.name}</td>
                  <td className={cn("py-2", p.state === "ok" ? "text-fg" : "text-muted")}>{STATE_VI[p.state] ?? p.state}</td>
                  <td className="py-2 text-muted">{p.reason ?? "—"}</td>
                  <td className="tabular py-2 text-right">{p.count}</td>
                  <td className="tabular py-2 text-right text-muted">{p.latencyMs ? `${p.latencyMs} ms` : "—"}</td>
                </tr>
              ))}
              {snapshot.providers.length === 0 && (
                <tr className="border-b border-line">
                  <td colSpan={5} className="py-2 text-muted">
                    Đang dùng dữ liệu tuyển chọn sẵn ({region === "VN" ? "Việt Nam" : "toàn cầu"}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="max-w-[70ch] text-xs leading-5 text-muted">
          Điểm số là trọng số nội bộ của vòng quay (độ mới, tín hiệu từ nguồn, số nguồn cùng nhắc tới, độ lạ, khả năng
          làm thành app) — không phải thước đo mức độ phổ biến khách quan.
        </p>
      </section>
    </main>
  );
}
