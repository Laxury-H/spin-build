"use client";

import { useSpin } from "@/lib/store";
import { toast } from "@/lib/ui/toast";
import type { Trend } from "@/types";

export function TrendTicker() {
  const trends = useSpin((s) => s.trends);
  const injectedTrend = useSpin((s) => s.injectedTrend);
  const injectTrend = useSpin((s) => s.injectTrend);

  const list = trends.trends?.slice(0, 20) ?? [];
  if (list.length === 0) return null;

  const handleInject = (t: Trend) => {
    injectTrend(t);
    toast(`INJECTED // ${t.title.toUpperCase()}`, {
      detail: "LOCKED INTO YOUR NEXT SPIN",
    });
  };

  return (
    <div className="w-full h-10 border-t border-line bg-surface flex items-center overflow-hidden shrink-0 group select-none">
      <div className="flex items-center px-4 shrink-0 label text-muted border-r border-line bg-surface z-10">
        <span className="w-2 h-2 rounded-full bg-fg mr-2 animate-pulse" />
        <span>CULTURE PULSE</span>
      </div>

      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center whitespace-nowrap gap-4 px-4 font-mono text-xs text-muted">
        {list.map((t) => {
          const isInjected = injectedTrend?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleInject(t)}
              className={`hover:text-fg hover:underline cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                isInjected ? "text-fg font-bold underline" : ""
              }`}
              title={`Inject "${t.title}" into next spin`}
            >
              <span>{t.title.toUpperCase()}</span>
              <span className="text-[10px] text-muted/60">({t.score})</span>
              <span className="text-muted/40">/</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
