"use client";

import { useSpin } from "@/lib/store";
import { chaosBand, REGIONS, type Region } from "@/types";
import { SoundIcon } from "@/components/ui/icons";

export function ChaosSlider({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const chaos = useSpin((s) => s.chaos);
  const setChaos = useSpin((s) => s.setChaos);
  const band = chaosBand(chaos);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 label ${className}`}>
        <span className="text-muted">CHAOS</span>
        <span className="font-mono tabular-nums text-fg">{chaos}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={chaos}
          onChange={(e) => setChaos(Number(e.target.value))}
          className="w-24 accent-fg cursor-pointer"
          aria-label="Chaos slider"
          aria-valuetext={`${chaos} percent, ${band.label}`}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-surface border border-line ${className}`}>
      <div className="flex items-center justify-between label">
        <span className="text-muted tracking-wider">CHAOS LEVEL</span>
        <span className="font-mono text-sm tabular-nums text-fg font-bold">
          {chaos}%
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-fg tracking-wide uppercase">{band.label}</span>
        <span className="text-[11px] text-muted truncate max-w-[180px]">{band.description}</span>
      </div>

      <div className="relative py-1">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={chaos}
          onChange={(e) => setChaos(Number(e.target.value))}
          className="w-full accent-fg cursor-pointer bg-line h-1 rounded-none"
          aria-label="Chaos level"
          aria-valuetext={`${chaos} percent, ${band.label}`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-muted tracking-widest uppercase">
        <span>SANE</span>
        <span className="text-subtle">EXPERIMENTAL</span>
        <span>UNHINGED</span>
      </div>
    </div>
  );
}

export function RegionToggle({ className = "" }: { className?: string }) {
  const region = useSpin((s) => s.region);
  const setRegion = useSpin((s) => s.setRegion);

  return (
    <div className={`inline-flex items-center rounded-lg bg-surface-2 p-0.5 border border-line text-xs font-mono ${className}`}>
      {REGIONS.map((r) => {
        const active = region === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => setRegion(r)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              active
                ? "bg-fg text-bg font-bold shadow-xs"
                : "text-muted hover:text-fg"
            }`}
          >
            {r === "VN" ? "Việt Nam 🇻🇳" : "Toàn cầu 🌐"}
          </button>
        );
      })}
    </div>
  );
}

export function AudioToggle({ className = "" }: { className?: string }) {
  const audio = useSpin((s) => s.audio);
  const setAudio = useSpin((s) => s.setAudio);

  return (
    <button
      type="button"
      onClick={() => setAudio(!audio)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
        audio
          ? "border-line-strong bg-surface-2 text-fg font-medium"
          : "border-line text-muted hover:text-fg hover:bg-surface"
      } ${className}`}
      aria-pressed={audio}
    >
      <SoundIcon on={audio} className="w-3.5 h-3.5" />
      <span>{audio ? "Âm thanh: Bật" : "Âm thanh: Tắt"}</span>
    </button>
  );
}

export function TrendEngineStatus({ className = "" }: { className?: string }) {
  const trendSync = useSpin((s) => s.trendSync);
  const trends = useSpin((s) => s.trends);

  let statusText = "ONLINE";
  let statusDot = "bg-fg";

  if (trendSync === "syncing") {
    statusText = "SYNCING";
    statusDot = "bg-muted animate-pulse";
  } else if (trends.status === "PARTIAL") {
    statusText = "PARTIAL";
  } else if (trends.status === "OFFLINE_CACHE") {
    statusText = "OFFLINE CACHE";
  }

  return (
    <div className={`inline-flex items-center gap-2 label text-muted ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
      <span>TREND ENGINE: {statusText}</span>
    </div>
  );
}
