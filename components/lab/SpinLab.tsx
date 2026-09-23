"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSpin } from "@/lib/store";
import { useHotkeys } from "@/lib/ui/hotkeys";
import { useOverlay } from "@/lib/ui/dialogs";
import { flashInvert } from "@/lib/ui/invert";
import { SECTORS, sectorPosition, POOL_ATOMS } from "@/data";
import { DNA_KEYS, DNA_LABEL } from "@/types";
import { RouletteWheel } from "@/components/roulette/RouletteWheel";
import { IdeaResult } from "@/components/idea/IdeaResult";
import { TrendTicker } from "./TrendTicker";
import { RevealOverlay } from "./RevealOverlay";
import {
  ChaosSlider,
  RegionToggle,
  AudioToggle,
} from "@/components/shell/controls";
import { Kbd } from "@/components/ui/Kbd";
import { Button } from "@/components/ui/Button";

export function SpinLab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const overlay = useOverlay();

  const phase = useSpin((s) => s.phase);
  const spinId = useSpin((s) => s.spinId);
  const revealId = useSpin((s) => s.revealId);
  const current = useSpin((s) => s.current);
  const locks = useSpin((s) => s.locks);
  const injectedTrend = useSpin((s) => s.injectedTrend);
  const chaos = useSpin((s) => s.chaos);
  const setChaos = useSpin((s) => s.setChaos);
  const audio = useSpin((s) => s.audio);

  const spin = useSpin((s) => s.spin);
  const settle = useSpin((s) => s.settle);
  const finishReveal = useSpin((s) => s.finishReveal);
  const skipToResult = useSpin((s) => s.skipToResult);
  const reroll = useSpin((s) => s.reroll);
  const backToWheel = useSpin((s) => s.backToWheel);
  const toggleLock = useSpin((s) => s.toggleLock);
  const clearLocks = useSpin((s) => s.clearLocks);
  const injectTrend = useSpin((s) => s.injectTrend);
  const toggleSave = useSpin((s) => s.toggleSave);

  // Target index for the wheel based on pre-computed idea
  const targetIndex = useMemo(() => {
    if (!current?.dna.domain.sector) return null;
    return sectorPosition(current.dna.domain.sector);
  }, [current]);

  // Handle URL query command (?cmd=spin|cursed|randomize)
  useEffect(() => {
    const cmd = searchParams.get("cmd");
    if (!cmd) return;

    if (cmd === "spin") {
      spin();
    } else if (cmd === "cursed") {
      spin({ cursed: true, chaos: 100 });
    } else if (cmd === "randomize") {
      clearLocks();
      spin({ chaos: Math.floor(Math.random() * 100) });
    }
    router.replace("/");
  }, [searchParams, router, spin, clearLocks]);

  // Wheel settle event
  const handleWheelSettle = useCallback(() => {
    flashInvert(160);
    settle();
  }, [settle]);

  // Hotkeys
  useHotkeys({
    space: (e) => {
      e.preventDefault();
      if (phase === "spinning") return;
      if (phase === "revealing") {
        skipToResult();
        return;
      }
      spin();
    },
    r: (e) => {
      e.preventDefault();
      if (current) reroll();
      else spin();
    },
    "1": () => toggleLock(DNA_KEYS[0]),
    "2": () => toggleLock(DNA_KEYS[1]),
    "3": () => toggleLock(DNA_KEYS[2]),
    "4": () => toggleLock(DNA_KEYS[3]),
    "5": () => toggleLock(DNA_KEYS[4]),
    "6": () => toggleLock(DNA_KEYS[5]),
    s: (e) => {
      e.preventDefault();
      toggleSave();
    },
    b: (e) => {
      e.preventDefault();
      if (current) overlay.show("brief");
    },
    "shift+s": (e) => {
      e.preventDefault();
      if (current) overlay.show("share");
    },
    escape: () => {
      if (phase === "result") {
        backToWheel();
      }
    },
  });

  return (
    <main className="flex-1 flex flex-col justify-between overflow-x-hidden min-h-[calc(100vh-56px)]">
      {/* Result Phase: Full-width clean idea showcase */}
      {phase === "result" && current ? (
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={backToWheel}
              className="gap-2"
            >
              <span>←</span>
              <span>QUAY TIẾP / VỀ VÒNG QUAY</span>
            </Button>

            <span className="text-xs font-mono text-muted hidden sm:inline">
              BẤM <strong className="text-fg font-bold">SPACE</strong> ĐỂ QUAY MỚI · <strong className="text-fg font-bold">R</strong> ĐỂ QUAY LẠI
            </span>
          </div>

          <IdeaResult
            idea={current}
            mode="lab"
            revealKey={revealId}
          />
        </div>
      ) : (
        /* Standby & Wheel Phase: Focused, clean, spacious */
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-3xl mx-auto w-full gap-3 sm:gap-4 my-auto">
          {/* Hero Header */}
          <div className="text-center flex flex-col items-center gap-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-surface-2/60 text-xs font-mono text-muted">
              <span>⚡ TRÌNH TẠO Ý TƯỞNG CÔNG NGHỆ</span>
              <span>·</span>
              <span>{POOL_ATOMS} MẢNH GHÉP</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-fg leading-tight">
              VÒNG QUAY Ý TƯỞNG SẢN PHẨM
            </h1>

            <p className="text-xs sm:text-sm text-muted max-w-lg leading-relaxed">
              Quay ngẫu nhiên 6 mảnh ghép: <strong className="text-fg">Lĩnh vực × Đối tượng × Cơ chế × Xu hướng × Điểm dị × Ràng buộc</strong> để tạo ra sản phẩm công nghệ tiếp theo của bạn.
            </p>
          </div>

          {/* Quick Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-surface/90 border border-line rounded-xl backdrop-blur-md text-xs">
            <div className="flex items-center gap-2 px-2 border-r border-line/60">
              <span className="text-muted font-mono text-[11px]">Khu vực:</span>
              <RegionToggle />
            </div>

            <div className="flex items-center gap-2 px-2 border-r border-line/60">
              <span className="text-muted font-mono text-[11px]">Độ dị:</span>
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setChaos(25)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    chaos <= 30 ? "bg-fg text-bg font-bold shadow-xs" : "text-muted hover:text-fg"
                  }`}
                >
                  Thực tế
                </button>
                <button
                  type="button"
                  onClick={() => setChaos(50)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    chaos > 30 && chaos < 80 ? "bg-fg text-bg font-bold shadow-xs" : "text-muted hover:text-fg"
                  }`}
                >
                  Cân bằng
                </button>
                <button
                  type="button"
                  onClick={() => setChaos(90)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                    chaos >= 80 ? "bg-fg text-bg font-bold shadow-xs" : "text-muted hover:text-fg"
                  }`}
                >
                  Siêu dị 🔥
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2">
              <AudioToggle />
            </div>
          </div>

          {/* Active Locks Notice */}
          {locks.length > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-2 border border-line-strong rounded-lg text-xs font-mono text-fg animate-in fade-in">
              <span className="text-muted">🔒 Đang giữ {locks.length} thành phần:</span>
              <span className="font-bold uppercase">{locks.join(", ")}</span>
              <button
                type="button"
                onClick={clearLocks}
                className="ml-2 text-muted hover:text-fg underline cursor-pointer"
              >
                Bỏ giữ tất cả
              </button>
            </div>
          )}

          {/* Injected Trend Notice */}
          {injectedTrend && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-2 border border-line-strong rounded-lg text-xs font-mono text-fg animate-in fade-in">
              <span className="text-muted">📈 Xu hướng đã chọn:</span>
              <span className="font-bold uppercase text-fg">{injectedTrend.title}</span>
              <button
                type="button"
                onClick={() => injectTrend(null)}
                className="ml-2 text-muted hover:text-fg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* The Roulette Wheel Arena */}
          <div className="relative w-full max-w-[360px] sm:max-w-[390px] flex flex-col items-center justify-center">
            <RouletteWheel
              sectors={SECTORS}
              spinId={spinId}
              targetIndex={targetIndex}
              onSettle={handleWheelSettle}
              onSpinRequest={() => spin()}
              audio={audio}
              disabled={phase === "spinning"}
              className="w-full max-w-[340px] sm:max-w-[370px]"
            />

            {/* Reveal Animation Overlay */}
            {phase === "revealing" && current && (
              <RevealOverlay
                idea={current}
                onComplete={finishReveal}
                onSkip={skipToResult}
              />
            )}
          </div>

          {/* Main Action Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => spin()}
              disabled={phase === "spinning"}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-3 sm:px-10 sm:py-3.5 rounded-xl bg-fg text-bg font-extrabold text-base sm:text-lg tracking-tight shadow-xl hover:opacity-95 hover:shadow-2xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="text-xl transition-transform group-hover:rotate-12">🎲</span>
              <span>QUAY Ý TƯỞNG NGAY</span>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-bg/20 text-bg text-xs font-mono rounded font-normal">
                SPACE
              </span>
            </button>

            <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
              <span>Bấm <Kbd>SPACE</Kbd> hoặc click tâm bánh xe để quay</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Cultural Trend Marquee */}
      <TrendTicker />
    </main>
  );
}
