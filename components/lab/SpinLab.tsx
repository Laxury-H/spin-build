"use client";

import { useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
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
import { CsgoReel } from "@/components/roulette/CsgoReel";
import { IdeaResult } from "@/components/idea/IdeaResult";
import { TrendTicker } from "./TrendTicker";
import { RevealOverlay } from "./RevealOverlay";
import { ChaosSlider, RegionToggle, AudioToggle, TrendEngineStatus } from "@/components/shell/controls";
import { Kbd } from "@/components/ui/Kbd";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { useHydrated, useReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/ui/cn";
import { useTranslation } from "@/lib/ui/useTranslation";

export function SpinLab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const overlay = useOverlay();
  const { t } = useTranslation();

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
  const [spinMode, setSpinMode] = useState<"csgo" | "wheel">("csgo");

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

  useEffect(() => {
    const { phase: p, skipToResult: skip } = useSpin.getState();
    if (p === "spinning" || p === "revealing") skip();
  }, []);

  const handleWheelSettle = useCallback(() => {
    flashInvert(160);
    settle();
  }, [settle]);

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
              <span aria-hidden="true">←</span> {t("back_to_lab")} <Kbd>ESC</Kbd>
            </button>
            <div className="label hidden items-center gap-4 text-muted sm:flex text-[10px] font-mono tracking-wider">
              <span className="flex items-center gap-1.5">
                <Kbd>SPACE</Kbd> {t("spin_btn")}
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>R</Kbd> {t("reroll_btn")}
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>1–6</Kbd> {t("gene_constraint")} (TOGGLE)
              </span>
            </div>
          </div>
          <IdeaResult idea={current} mode="lab" revealKey={revealId} />
        </div>
      )}

      <div className={`${showResult ? "hidden" : "grid"} mx-auto w-full max-w-[1400px] flex-1 grid-cols-1 gap-8 px-4 py-6 md:px-8 lg:grid-cols-12 lg:gap-6 lg:py-8`}>
        <section className="flex flex-col justify-between gap-8 lg:col-span-3">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-fg rounded-full" />
              <span className="label font-mono text-[10px] text-muted tracking-widest uppercase">{t("lab_active")}</span>
            </div>
            <h1 className="display text-[clamp(2.2rem,3vw,3.4rem)] tracking-tight leading-[1]">
              {t("hero_title_1")}
              <br />
              {t("hero_title_2")}
              <br />
              {t("hero_title_3")}
            </h1>
            <p className="font-mono text-xs leading-6 text-muted">
              {t("hero_desc_1")}
              <br />
              {t("hero_desc_2")}
              <br />
              {t("hero_desc_3")}
            </p>
          </div>

          <nav className="hidden flex-col border-t border-line lg:flex" aria-label="Lối tắt">
            <RailLink href="/daily">DAILY SEED // {today !== null ? String(today).padStart(4, "0") : "····"}</RailLink>
            <RailLink href="/fuse">{t("nav_fuse")}</RailLink>
            <button
              type="button"
              onClick={() => overlay.show("palette")}
              className="label flex items-center justify-between border-b border-line py-3 text-muted transition-colors hover:text-fg font-mono text-xs"
            >
              <span>{t("command_palette")}</span>
              <Kbd>⌘K</Kbd>
            </button>
            <p className="label mt-6 leading-5 text-subtle font-mono text-[9px] uppercase tracking-widest">
              {t("gene_domain")} × {t("gene_target")} × {t("gene_mechanic")}
              <br />× {t("gene_trend")} × {t("gene_chaos")} × {t("gene_constraint")}
              <br />= {t("hero_title_1")}
            </p>
          </nav>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 lg:col-span-6" aria-label="Khu vực quay ý tưởng">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="label flex h-4 items-center gap-2 text-muted font-mono text-[10px]" aria-hidden="true">
              <span>▼</span>
              <span ref={readoutRef} className="tabular whitespace-pre text-fg font-bold tracking-widest">
                {t("ready_to_spin")}
              </span>
            </div>

            <div className="flex items-center border border-line bg-surface/50 p-0.5" role="group">
              <button
                type="button"
                onClick={() => setSpinMode("csgo")}
                className={cn(
                  "px-2.5 py-1 text-[9px] font-mono tracking-widest transition-colors",
                  spinMode === "csgo" ? "bg-fg text-bg font-bold shadow-sm" : "text-muted hover:text-fg"
                )}
              >
                [ CONCEPT STRIP ]
              </button>
              <button
                type="button"
                onClick={() => setSpinMode("wheel")}
                className={cn(
                  "px-2.5 py-1 text-[9px] font-mono tracking-widest transition-colors",
                  spinMode === "wheel" ? "bg-fg text-bg font-bold shadow-sm" : "text-muted hover:text-fg"
                )}
              >
                [ RADAR WHEEL ]
              </button>
            </div>
          </div>

          {spinMode === "csgo" ? (
            <div className="relative w-full my-auto">
              <CsgoReel
                sectors={SECTORS}
                spinId={spinId}
                targetIndex={targetIndex}
                onSettle={handleWheelSettle}
                onTick={handleTick}
                onSpinRequest={() => spin()}
                audio={audio}
                reducedMotion={reducedMotion}
                disabled={phase === "spinning"}
                className="w-full shadow-2xl"
              />
              {phase === "revealing" && current && (
                <RevealOverlay idea={current} onComplete={finishReveal} onSkip={skipToResult} />
              )}
            </div>
          ) : (
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
          )}

          <p className="label flex items-center gap-2 text-muted pointer-coarse:hidden font-mono text-[10px] tracking-wider uppercase">
            <Kbd>SPACE</Kbd> {t("space_to_spin")} {spinMode === "wheel" ? t("click_to_spin") : ""}
          </p>
          <p className="label hidden text-muted pointer-coarse:block font-mono text-[10px] tracking-wider uppercase">
            {t("touch_to_spin")}
          </p>

          {current && phase === "idle" && (
            <Button size="sm" variant="outline" onClick={() => useSpin.getState().loadIdea(current, { record: false })}>
              {t("view_recent")} <ArrowRightIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-3" aria-label="System Telemetry">
          <dl className="flex flex-col border border-line bg-surface/20 backdrop-blur-sm p-4 hover:border-line-strong transition-colors">
            <Row label={t("trend_engine")} first>
              <TrendEngineStatus bare />
            </Row>
            <Row label={t("pool_size")}>
              <span className="tabular font-mono font-bold">{POOL_ATOMS + liveTrendCount} ATOMS</span>
            </Row>
            <Row label={t("region")}>
              <RegionToggle />
            </Row>
            <Row label={t("seed")}>
              <span className="tabular font-mono text-fg">{current && phase !== "idle" ? current.recipe.seed : "RANDOM"}</span>
            </Row>
            <Row label={t("audio")}>
              <AudioToggle />
            </Row>
          </dl>

          <ChaosSlider />

          {injectedTrend && (
            <div className="flex items-center justify-between border border-line bg-surface/20 backdrop-blur-sm p-4">
              <div className="flex flex-col gap-0.5">
                <span className="label text-muted text-[10px]">{t("injected_trend")}</span>
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
            <div className="flex items-start justify-between gap-3 border border-line bg-surface/20 backdrop-blur-sm p-4">
              <div className="flex flex-col gap-1">
                <span className="label text-muted text-[10px]">{t("locked_genes")}</span>
                <span className="label text-fg font-mono text-xs">{locks.map((k) => DNA_LABEL[k]).join(" · ")}</span>
              </div>
              <button type="button" onClick={clearLocks} className="label text-muted underline-offset-4 hover:text-fg hover:underline text-xs">
                {t("unlock_all")}
              </button>
            </div>
          )}
        </aside>
      </div>

      {!showResult && <TrendTicker />}
    </main>
  );
}

function Row({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4 py-2", !first && "border-t border-line/50")}>
      <dt className="label text-muted text-[10px] font-mono tracking-wider">{label}</dt>
      <dd className="label text-right text-fg text-xs font-mono">{children}</dd>
    </div>
  );
}

function RailLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="label group flex items-center justify-between border-b border-line py-3 text-muted transition-colors hover:text-fg font-mono text-xs uppercase"
    >
      <span>{children}</span>
      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
