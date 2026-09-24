"use client";

import { useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSpin } from "@/lib/store";
import { useHotkeys } from "@/lib/ui/hotkeys";
import { useOverlay } from "@/lib/ui/dialogs";
import { flashInvert } from "@/lib/ui/invert";
import { dailyNumber } from "@/lib/random";
import { SECTORS, sectorPosition, POOL_ATOMS } from "@/data";
import { DNA_KEYS, DNA_LABEL } from "@/types";
import { RouletteWheel } from "@/components/roulette/RouletteWheel";
import { IdeaResult } from "@/components/idea/IdeaResult";
import { TrendTicker } from "./TrendTicker";
import { RevealOverlay } from "./RevealOverlay";
import { ChaosSlider, RegionToggle, AudioToggle, TrendEngineStatus } from "@/components/shell/controls";
import { Kbd } from "@/components/ui/Kbd";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { useHydrated, useReducedMotion } from "@/lib/hooks";

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
  const audio = useSpin((s) => s.audio);
  const liveTrendCount = useSpin((s) => s.trends.trends.filter((t) => t.source !== "curated").length);

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

  const reducedMotion = useReducedMotion();
  // Sector readout above the selector, written directly on every tick (no re-render).
  const readoutRef = useRef<HTMLSpanElement>(null);
  const handleTick = useCallback((i: number) => {
    const s = SECTORS[i];
    if (readoutRef.current && s) readoutRef.current.textContent = `${String(s.index).padStart(2, "0")}  ${s.label}`;
  }, []);
  const hydrated = useHydrated();
  const today = hydrated ? dailyNumber(new Date()) : null;

  const targetIndex = useMemo(
    () => (current?.dna.domain.sector ? sectorPosition(current.dna.domain.sector) : null),
    [current],
  );

  // ?cmd=spin|cursed|randomize (sent by the command palette from other pages)
  useEffect(() => {
    const cmd = searchParams.get("cmd");
    if (!cmd) return;
    if (cmd === "spin") spin();
    else if (cmd === "cursed") spin({ cursed: true, chaos: 100 });
    else if (cmd === "randomize") {
      clearLocks();
      spin({ chaos: Math.floor(Math.random() * 101) });
    }
    router.replace("/");
  }, [searchParams, router, spin, clearLocks]);

  // Navigated away mid-spin? The wheel remounts idle, so jump straight to the result.
  useEffect(() => {
    const { phase: p, skipToResult: skip } = useSpin.getState();
    if (p === "spinning" || p === "revealing") skip();
  }, []);

  const handleWheelSettle = useCallback(() => {
    flashInvert(160);
    settle();
  }, [settle]);

  // The wheel stays mounted behind the result view, so a fresh spin just works.
  const spinFresh = useCallback(() => spin(), [spin]);

  useHotkeys({
    space: (e) => {
      e.preventDefault();
      if (phase === "spinning") return;
      if (phase === "revealing") return skipToResult();
      spinFresh();
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
      if (current) toggleSave();
    },
    m: (e) => {
      e.preventDefault();
      if (current && phase === "result") overlay.show("mutate");
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
      if (phase === "result") backToWheel();
    },
  });

  const showResult = phase === "result" && current !== null;

  return (
    <main className="flex min-h-[calc(100dvh-56px)] flex-col">
      {showResult && current && (
        <div className="enter mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <button
              type="button"
              onClick={backToWheel}
              className="label flex items-center gap-2 text-muted transition-colors hover:text-fg font-mono text-xs"
            >
              <span aria-hidden="true">←</span> VỀ VÒNG QUAY LAB <Kbd>ESC</Kbd>
            </button>
            <div className="label hidden items-center gap-4 text-muted sm:flex text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Kbd>SPACE</Kbd> QUAY MỚI
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>R</Kbd> QUAY MẢNH MỞ
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>1–6</Kbd> GHIM GEN
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>B</Kbd> BRIEF
              </span>
            </div>
          </div>
          <IdeaResult idea={current} mode="lab" revealKey={revealId} />
        </div>
      )}

      <div className={`${showResult ? "hidden" : "grid"} mx-auto w-full max-w-[1400px] flex-1 grid-cols-1 gap-8 px-4 py-6 md:px-8 lg:grid-cols-12 lg:gap-6 lg:py-8`}>
        {/* Left rail: hero */}
        <section className="flex flex-col justify-between gap-8 lg:col-span-3">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-fg inline-block" />
              <span className="label font-mono text-xs text-muted tracking-wider">LABORATORY READY</span>
            </div>
            <h1 className="display text-[clamp(2.2rem,3vw,3.4rem)] tracking-tight">
              BUILD SOMETHING
              <br />
              THAT SHOULDN&apos;T
              <br />
              EXIST.
            </h1>
            <p className="font-mono text-xs leading-6 text-muted">
              XU HƯỚNG THỜI GIAN THỰC.
              <br />
              NGẪU NHIÊN CÓ KIỂM SOÁT.
              <br />
              ĐỘT PHÁ NGOÀI KHUÔN KHỔ.
            </p>
          </div>

          <nav className="hidden flex-col border-t border-line lg:flex" aria-label="Lối tắt">
            <RailLink href="/daily">DAILY SEED // {today !== null ? String(today).padStart(4, "0") : "····"}</RailLink>
            <RailLink href="/fuse">LAI TẠO Ý TƯỞNG (FUSE LAB)</RailLink>
            <button
              type="button"
              onClick={() => overlay.show("palette")}
              className="label flex items-center justify-between border-b border-line py-3 text-muted transition-colors hover:text-fg font-mono text-xs"
            >
              <span>BẢNG LỆNH TẬP TRUNG</span>
              <Kbd>⌘K</Kbd>
            </button>
            <p className="label mt-6 leading-5 text-subtle font-mono text-[11px]">
              LĨNH VỰC × ĐỐI TƯỢNG × CƠ CHẾ
              <br />× XU HƯỚNG × CHAOS × RÀNG BUỘC
              <br />= Ý TƯỞNG SẢN PHẨM MỚI
            </p>
          </nav>
        </section>

        {/* Center: the wheel */}
        <section className="flex flex-col items-center justify-center gap-4 lg:col-span-6" aria-label="Vòng quay">
          <div className="label flex h-4 items-center gap-2 text-muted font-mono text-xs" aria-hidden="true">
            <span>▼</span>
            <span ref={readoutRef} className="tabular whitespace-pre text-fg font-bold tracking-wider">
              --  SẴN SÀNG QUAY
            </span>
          </div>

          <div className="relative w-full max-w-[min(100%,calc(100dvh-230px))] min-w-[260px]">
            <RouletteWheel
              sectors={SECTORS}
              spinId={spinId}
              targetIndex={targetIndex}
              onSettle={handleWheelSettle}
              onTick={handleTick}
              onSpinRequest={() => spin()}
              activeIndex={phase === "idle" || phase === "result" ? targetIndex : null}
              reducedMotion={reducedMotion}
              audio={audio}
              disabled={phase === "spinning"}
              className="w-full"
            />
            {phase === "revealing" && current && (
              <RevealOverlay idea={current} onComplete={finishReveal} onSkip={skipToResult} />
            )}
          </div>

          <p className="label flex items-center gap-2 text-muted pointer-coarse:hidden font-mono text-xs">
            <Kbd>SPACE</Kbd> ĐỂ QUAY <span className="text-subtle">·</span> HOẶC NHẤP VÀO TÂM / VUỐT BÁNH XE
          </p>
          <p className="label hidden text-muted pointer-coarse:block font-mono text-xs">
            CHẠM TÂM HOẶC VUỐT BÁNH XE ĐỂ QUAY
          </p>

          {current && phase === "idle" && (
            <Button size="sm" variant="outline" onClick={() => useSpin.getState().loadIdea(current, { record: false })}>
              Xem lại ý tưởng vừa quay <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </section>

        {/* Right rail: system readout */}
        <aside className="flex flex-col gap-6 lg:col-span-3" aria-label="Thông số hệ thống">
          <dl className="flex flex-col border-t border-line">
            <Row label="TREND ENGINE">
              <TrendEngineStatus bare />
            </Row>
            <Row label="KHO DỮ LIỆU">
              <span className="tabular font-mono font-bold">{POOL_ATOMS + liveTrendCount} ATOMS</span>
            </Row>
            <Row label="KHU VỰC">
              <RegionToggle />
            </Row>
            <Row label="SEED TẤT ĐỊNH">
              <span className="tabular font-mono text-fg">{current && phase !== "idle" ? current.recipe.seed : "RANDOM"}</span>
            </Row>
            <Row label="ÂM THANH TACTILE">
              <AudioToggle />
            </Row>
          </dl>

          <ChaosSlider />

          {injectedTrend && (
            <div className="flex items-center justify-between border border-line-strong bg-surface/50 p-3">
              <div className="flex flex-col gap-0.5">
                <span className="label text-muted text-[10px]">XU HƯỚNG ĐƯỢC CHÈN</span>
                <span className="font-mono text-xs font-bold text-fg uppercase truncate max-w-[180px]">
                  {injectedTrend.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => injectTrend(null)}
                aria-label="Hủy chèn xu hướng"
                className="label text-muted hover:text-fg text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {locks.length > 0 && (
            <div className="flex items-start justify-between gap-3 border border-line p-3 bg-surface/30">
              <div className="flex flex-col gap-1">
                <span className="label text-muted text-[10px]">CÁC GEN ĐANG KHÓA</span>
                <span className="label text-fg font-mono text-xs">{locks.map((k) => DNA_LABEL[k]).join(" · ")}</span>
              </div>
              <button type="button" onClick={clearLocks} className="label text-muted underline-offset-4 hover:text-fg hover:underline text-xs">
                Mở khóa tất cả
              </button>
            </div>
          )}
        </aside>
      </div>

      {!showResult && <TrendTicker />}
    </main>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line py-2">
      <dt className="label text-muted text-xs font-mono">{label}</dt>
      <dd className="label text-right text-fg text-xs font-mono">{children}</dd>
    </div>
  );
}

function RailLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="label group flex items-center justify-between border-b border-line py-3 text-muted transition-colors hover:text-fg font-mono text-xs"
    >
      <span>{children}</span>
      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
