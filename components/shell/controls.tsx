"use client";

import { useSpin } from "@/lib/store";
import { chaosBand, CHAOS_BANDS, REGIONS } from "@/types";
import { cn } from "@/lib/ui/cn";

/** Vietnamese copy for the five chaos bands (types/CHAOS_BANDS order). */
const BAND_VI: Record<string, string> = {
  SANE: "Công cụ thực dụng, dùng được ngay.",
  CREATIVE: "Side project có cá tính.",
  EXPERIMENTAL: "Sản phẩm thử nghiệm.",
  WEIRD: "App internet kỳ quặc.",
  CURSED: "Bị nguyền, nhưng biết đâu lại hay.",
};

const PRESETS = [
  { label: "Thực tế", value: 15 },
  { label: "Cân bằng", value: 50 },
  { label: "Siêu dị", value: 90 },
];

/** SANE ──●── UNHINGED. Native range input (keyboard + screen reader ready). */
export function ChaosSlider({ className, compact = false }: { className?: string; compact?: boolean }) {
  const chaos = useSpin((s) => s.chaos);
  const setChaos = useSpin((s) => s.setChaos);
  const band = chaosBand(chaos);

  const input = (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={chaos}
      onChange={(e) => setChaos(Number(e.target.value))}
      className="range w-full"
      aria-label="Độ dị"
      aria-valuetext={`${chaos} phần trăm, ${band.label}`}
    />
  );

  if (compact) {
    return (
      <div className={cn("label flex items-center gap-3", className)}>
        <span className="text-muted">Độ dị</span>
        <span className="tabular w-9 text-fg">{chaos}%</span>
        <div className="w-28">{input}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="label text-muted">Độ dị</span>
          <span className="label text-fg">{band.label}</span>
        </div>
        <span
          className={cn(
            "tabular px-1 font-sans text-4xl font-semibold leading-none tracking-[-0.04em]",
            chaos >= 80 && "bg-fg text-bg",
          )}
        >
          {chaos}%
        </span>
      </div>

      <div className="relative">
        {input}
        {CHAOS_BANDS.slice(1).map((b) => (
          <span
            key={b.min}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-2 w-px -translate-y-1/2 bg-line-strong"
            style={{ left: `calc(7px + (100% - 14px) * ${b.min / 100})` }}
          />
        ))}
      </div>

      <div className="label flex justify-between text-subtle">
        <span>Sane</span>
        <span>Unhinged</span>
      </div>

      <p className="text-xs leading-5 text-muted">{BAND_VI[band.label] ?? band.description}</p>

      <div className="grid grid-cols-3 border border-line" role="group" aria-label="Mức độ dị có sẵn">
        {PRESETS.map((p, i) => {
          const active = Math.abs(chaos - p.value) <= 10;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setChaos(p.value)}
              aria-pressed={active}
              className={cn(
                "label h-9 transition-colors",
                i > 0 && "border-l border-line",
                active ? "bg-fg text-bg" : "text-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RegionToggle({ className }: { className?: string }) {
  const region = useSpin((s) => s.region);
  const setRegion = useSpin((s) => s.setRegion);

  return (
    <div className={cn("label inline-flex border border-line", className)} role="group" aria-label="Khu vực xu hướng">
      {REGIONS.map((r, i) => {
        const active = region === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => setRegion(r)}
            aria-pressed={active}
            className={cn(
              "h-7 px-2.5 transition-colors",
              i > 0 && "border-l border-line",
              active ? "bg-fg text-bg" : "text-muted hover:text-fg",
            )}
          >
            {r === "VN" ? "Việt Nam" : "Toàn cầu"}
          </button>
        );
      })}
    </div>
  );
}

export function AudioToggle({ className }: { className?: string }) {
  const audio = useSpin((s) => s.audio);
  const setAudio = useSpin((s) => s.setAudio);

  return (
    <button
      type="button"
      onClick={() => setAudio(!audio)}
      aria-pressed={audio}
      className={cn("label transition-colors", audio ? "text-fg" : "text-muted hover:text-fg", className)}
    >
      {audio ? "[ Bật ]" : "[ Tắt ]"}
    </button>
  );
}

export function TrendEngineStatus({ className, bare = false }: { className?: string; bare?: boolean }) {
  const trendSync = useSpin((s) => s.trendSync);
  const status = useSpin((s) => s.trends.status);

  const text =
    trendSync === "syncing"
      ? "Đang đồng bộ"
      : status === "ONLINE"
        ? "Online"
        : status === "PARTIAL"
          ? "Một phần"
          : "Bộ nhớ đệm";

  if (bare) return <span className={className}>{text}</span>;

  return <span className={cn("label text-muted", className)}>Trend engine: {text}</span>;
}
