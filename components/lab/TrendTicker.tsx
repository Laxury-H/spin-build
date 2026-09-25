"use client";

import { useSpin } from "@/lib/store";
import { useTranslation } from "@/lib/ui/useTranslation";
import { toast } from "@/lib/ui/toast";
import type { Trend } from "@/types";

/** Bottom marquee of live trends. Each item injects that trend into the next spin. */
export function TrendTicker() {
  const trends = useSpin((s) => s.trends.trends);
  const injectedTrend = useSpin((s) => s.injectedTrend);
  const injectTrend = useSpin((s) => s.injectTrend);
  const { t } = useTranslation();

  const list = trends.slice(0, 18);
  if (list.length === 0) return null;

  const inject = (t: Trend) => {
    injectTrend(t);
    toast(`TARGET LOCKED // ${t.title.toUpperCase()}`);
  };

  const items = (copy: number) =>
    list.map((t) => (
      <button
        key={`${copy}-${t.id}`}
        type="button"
        tabIndex={copy === 0 ? 0 : -1}
        aria-hidden={copy === 0 ? undefined : true}
        onClick={() => inject(t)}
        className={`label shrink-0 px-5 transition-colors hover:text-fg ${
          injectedTrend?.id === t.id ? "text-fg underline underline-offset-4" : "text-muted"
        }`}
        title={`Inject ${t.title}`}
      >
        {t.title}
      </button>
    ));

  return (
    <div className="flex h-10 shrink-0 items-center border-t border-line/50 bg-bg/50 backdrop-blur-md relative z-10">
      <span className="label flex h-full shrink-0 items-center border-r border-line/30 px-4 text-fg md:px-8 bg-surface/20 backdrop-blur-sm">LIVE TRENDS</span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-[ticker_80s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
          {items(0)}
          {items(1)}
        </div>
      </div>
    </div>
  );
}
