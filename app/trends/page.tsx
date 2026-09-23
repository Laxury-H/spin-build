"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { toast } from "@/lib/ui/toast";
import { Button } from "@/components/ui/Button";
import type { TrendCategory, Trend, Region } from "@/types";

const CATEGORIES: ("ALL" | TrendCategory)[] = [
  "ALL",
  "AI",
  "TECH",
  "CULTURE",
  "MEME",
  "VIDEO",
  "MUSIC",
  "FINANCE",
  "GAMING",
  "LIFESTYLE",
];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "TẤT CẢ",
  AI: "TRÍ TUỆ AI",
  TECH: "CÔNG NGHỆ",
  CULTURE: "VĂN HÓA",
  MEME: "MEME / VIRAL",
  VIDEO: "VIDEO / TIKTOK",
  MUSIC: "ÂM NHẠC",
  FINANCE: "TÀI CHÍNH",
  GAMING: "GAMING",
  LIFESTYLE: "LỐI SỐNG",
};

export default function TrendsPage() {
  const router = useRouter();
  const trends = useSpin((s) => s.trends);
  const trendSync = useSpin((s) => s.trendSync);
  const refreshTrends = useSpin((s) => s.refreshTrends);
  const region = useSpin((s) => s.region);
  const setRegion = useSpin((s) => s.setRegion);
  const injectTrend = useSpin((s) => s.injectTrend);
  const injectedTrend = useSpin((s) => s.injectedTrend);

  const [selectedCategory, setSelectedCategory] = useState<"ALL" | TrendCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allItems = trends.trends ?? [];

  // Filter items
  const items = allItems.filter((t) => {
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.angle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleManualCrawl = async () => {
    setIsRefreshing(true);
    try {
      await refreshTrends({ force: true });
      toast("ĐÃ CẬP NHẬT XU HƯỚNG LIVE!", {
        detail: `Hệ thống đã crawl live thành công từ Hacker News & Google Trends (${region}).`,
      });
    } catch {
      toast("KHÔNG THỂ CẬP NHẬT LIVE", {
        detail: "Đang hiển thị dữ liệu bộ nhớ đệm an toàn.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInject = (t: Trend) => {
    injectTrend(t);
    toast(`ĐÃ KHÓA XU HƯỚNG // ${t.title.toUpperCase()}`, {
      detail: "Đã chọn làm xu hướng hạt nhân cho vòng quay tiếp theo",
      action: {
        label: "VỀ VÒNG QUAY",
        onAction: () => router.push("/"),
      },
    });
  };

  const isLive = trends.status === "ONLINE" || trends.status === "PARTIAL";
  const syncing = trendSync === "syncing" || isRefreshing;
  const lastUpdatedTime = trends.fetchedAt
    ? new Date(trends.fetchedAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Vừa xong";

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">
      {/* Header & Live Engine Status Banner */}
      <div className="flex flex-col gap-5 border-b border-line pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isLive ? "bg-emerald-500" : "bg-zinc-500"
                }`}
              />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg flex items-center gap-2">
              <span>{isLive ? "CRAWLER LIVE: HOẠT ĐỘNG" : "CHẾ ĐỘ CACHE NGOẠI TUYẾN"}</span>
              <span className="text-muted font-normal">• Tự động crawl 10 phút/lần</span>
            </span>
          </div>

          {/* Region Switcher & Manual Crawl Button */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setRegion("GLOBAL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  region === "GLOBAL"
                    ? "bg-fg text-bg font-bold shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                TOÀN CẦU
              </button>
              <button
                type="button"
                onClick={() => setRegion("VN")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  region === "VN"
                    ? "bg-fg text-bg font-bold shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                VIỆT NAM
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleManualCrawl}
              disabled={syncing}
              className="text-xs font-mono flex items-center gap-1.5"
            >
              <span className={`inline-block ${syncing ? "animate-spin" : ""}`}>🔄</span>
              <span>{syncing ? "ĐANG QUÉT..." : "CRAWL LIVE NGAY"}</span>
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-fg uppercase tracking-tight">
            XU HƯỚNG CÔNG NGHỆ & MẠNG XÃ HỘI
          </h1>
          <p className="text-sm text-muted max-w-3xl leading-relaxed mt-1">
            Dữ liệu trực tiếp được crawl liên tục từ Hacker News API (công nghệ & AI) và Google Trends RSS (tìm kiếm thịnh hành). Bấm chọn bất kỳ xu hướng nào để đưa vào vòng quay ý tưởng.
          </p>
        </div>

        {/* Live Feeds Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-line bg-surface/60 text-xs">
          <div>
            <div className="text-[11px] text-muted font-mono uppercase">Tổng xu hướng</div>
            <div className="font-bold text-fg font-mono text-base mt-0.5">
              {allItems.length} <span className="text-xs font-normal text-muted">chủ đề</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted font-mono uppercase">Cập nhật lúc</div>
            <div className="font-bold text-fg font-mono text-base mt-0.5">{lastUpdatedTime}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted font-mono uppercase">Hacker News</div>
            <div className="font-bold text-emerald-400 font-mono text-base mt-0.5 flex items-center gap-1">
              <span>●</span> Live API
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted font-mono uppercase">Google Trends</div>
            <div className="font-bold text-emerald-400 font-mono text-base mt-0.5 flex items-center gap-1">
              <span>●</span> RSS Realtime
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Tìm kiếm xu hướng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 pl-8 rounded-lg border border-line bg-surface text-xs text-fg placeholder:text-muted focus:outline-none focus:border-line-strong transition-colors"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const count =
              cat === "ALL"
                ? allItems.length
                : allItems.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-fg bg-fg text-bg font-bold shadow-xs"
                    : "border-line bg-surface text-muted hover:text-fg hover:border-line-strong hover:bg-surface-2"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Trends Grid */}
      {items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-line rounded-2xl flex flex-col items-center gap-2">
          <span className="text-2xl">🔍</span>
          <p className="text-sm text-fg font-medium">Không tìm thấy xu hướng phù hợp</p>
          <p className="text-xs text-muted">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục "Tất cả".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            const isInjected = injectedTrend?.id === t.id;
            const isHN = t.source === "tech";
            const isGoogle = t.source === "search";

            const sourceBadge = isHN
              ? { label: "HACKER NEWS", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" }
              : isGoogle
              ? { label: "GOOGLE TRENDS", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" }
              : { label: "CURATED", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30" };

            return (
              <div
                key={t.id}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition-all bg-surface/90 ${
                  isInjected
                    ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/40"
                    : "border-line hover:border-line-strong hover:bg-surface-2/60"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border uppercase ${sourceBadge.color}`}>
                        {sourceBadge.label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-line text-[10px] font-mono text-muted uppercase">
                        {t.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-xs text-amber-400">
                      <span>🔥</span>
                      <span className="font-bold">{t.score}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-fg tracking-tight leading-snug">
                    {t.title}
                  </h3>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {t.angle || "Xu hướng đang lan rộng trên mạng xã hội và cộng đồng công nghệ."}
                  </p>

                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted hover:text-fg hover:underline inline-flex items-center gap-1 self-start font-mono"
                    >
                      <span>Nguồn tham khảo</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-line/60">
                  <Button
                    size="sm"
                    variant={isInjected ? "solid" : "outline"}
                    onClick={() => handleInject(t)}
                    className="w-full text-xs font-mono"
                  >
                    {isInjected ? "ĐÃ CHỌN CHO VÒNG QUAY ✓" : "CHỌN CHO VÒNG QUAY"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
