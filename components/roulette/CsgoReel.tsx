"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Sector } from "@/types";
import { useTranslation } from "@/lib/ui/useTranslation";
import { playCsgoTick, playCsgoSettle } from "./audio";

export interface CsgoReelProps {
  sectors: readonly Sector[];
  spinId: number;
  targetIndex: number | null;
  onSettle?: (index: number) => void;
  onTick?: (index: number) => void;
  onSpinRequest?: () => void;
  audio?: boolean;
  reducedMotion?: boolean;
  disabled?: boolean;
  className?: string;
}

export type RarityTier = "GOLD" | "COVERT" | "CLASSIFIED" | "RESTRICTED" | "MILSPEC";

export interface RarityConfig {
  tier: RarityTier;
  label: string;
  color: string;
  bgGlow: string;
  borderClass: string;
}

export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  GOLD: { tier: "GOLD", label: "★ EXCEEDINGLY RARE", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-fg" },
  COVERT: { tier: "COVERT", label: "COVERT", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-line-strong" },
  CLASSIFIED: { tier: "CLASSIFIED", label: "CLASSIFIED", color: "var(--fg)", bgGlow: "transparent", borderClass: "border-line" },
  RESTRICTED: { tier: "RESTRICTED", label: "RESTRICTED", color: "var(--muted)", bgGlow: "transparent", borderClass: "border-line/50" },
  MILSPEC: { tier: "MILSPEC", label: "MIL-SPEC", color: "var(--muted)", bgGlow: "transparent", borderClass: "border-line/20" },
};

/** Map sector indexes (0-17) to CS:GO weapon case rarity tiers */
function getSectorRarity(sectorIndex: number): RarityConfig {
  if (sectorIndex === 0 || sectorIndex === 9 || sectorIndex === 17) {
    return RARITY_CONFIGS.GOLD;
  }
  if (sectorIndex === 1 || sectorIndex === 6 || sectorIndex === 13) {
    return RARITY_CONFIGS.COVERT;
  }
  if (sectorIndex === 3 || sectorIndex === 7 || sectorIndex === 11) {
    return RARITY_CONFIGS.CLASSIFIED;
  }
  if (sectorIndex === 2 || sectorIndex === 5 || sectorIndex === 10 || sectorIndex === 15) {
    return RARITY_CONFIGS.RESTRICTED;
  }
  return RARITY_CONFIGS.MILSPEC;
}

const CARD_WIDTH = 160;
const CARD_GAP = 10;
const STEP = CARD_WIDTH + CARD_GAP; // 170px per item
const WIN_SLOT_INDEX = 45; // Winning card positioned at slot 45
const TOTAL_SLOTS = 65;
const DURATION_MS = 7500;

export function CsgoReel({
  sectors,
  spinId,
  targetIndex,
  onSettle,
  onTick,
  onSpinRequest,
  audio = true,
  reducedMotion = false,
  disabled = false,
  className = "",
}: CsgoReelProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastSpinIdRef = useRef<number | null>(spinId);

  const [isSpinning, setIsSpinning] = useState(false);
  const [needleTick, setNeedleTick] = useState(false);

  // Derived state: winning item highlighted only when not spinning
  const landedIndex = isSpinning ? null : targetIndex;

  // Generate deterministic randomized reel items leading up to the target slot
  const reelItems = useMemo(() => {
    const list: { key: string; slot: number; sector: Sector; rarity: RarityConfig }[] = [];
    const count = sectors.length;
    let seedVal = (spinId * 9301 + 49297) % 233280;
    const rnd = () => {
      seedVal = (seedVal * 9301 + 49297) % 233280;
      return seedVal / 233280;
    };

    for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
      let sec: Sector;
      if (slot === WIN_SLOT_INDEX && targetIndex !== null && sectors[targetIndex]) {
        sec = sectors[targetIndex];
      } else {
        const randSecIdx = Math.floor(rnd() * count);
        sec = sectors[randSecIdx];
      }
      const rarity = getSectorRarity(sec.index);
      list.push({
        key: `slot-${slot}-${sec.id}`,
        slot,
        sector: sec,
        rarity,
      });
    }
    return list;
  }, [sectors, targetIndex, spinId]);

  // Position track to center a specific slot
  const centerSlot = useCallback((slot: number, jitterPx = 0) => {
    if (!containerRef.current || !trackRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const targetCenter = slot * STEP + CARD_WIDTH / 2 + jitterPx;
    const offset = containerW / 2 - targetCenter;
    trackRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
  }, []);

  // Sync initial position on mount or when targetIndex changes while idle
  useEffect(() => {
    if (isSpinning || targetIndex === null) return;
    centerSlot(WIN_SLOT_INDEX, 0);
  }, [targetIndex, isSpinning, centerSlot]);

  // Spin animation trigger
  useEffect(() => {
    if (spinId === 0 || spinId === lastSpinIdRef.current || targetIndex === null) {
      return;
    }
    lastSpinIdRef.current = spinId;

    if (reducedMotion) {
      centerSlot(WIN_SLOT_INDEX, 0);
      const timer = setTimeout(() => {
        if (audio) playCsgoSettle();
        onSettle?.(targetIndex);
      }, 100);
      return () => clearTimeout(timer);
    }

    if (!containerRef.current || !trackRef.current) return;

    let animId: number;
    const containerW = containerRef.current.clientWidth;

    // CS:GO suspense jitter: landing slightly left or right of the card center
    const jitterMax = CARD_WIDTH * 0.38; // Up to 60px off-center for nailbiting near-misses
    const jitter = Math.sin(spinId * 17.3) * jitterMax;

    // Start position: slot 3
    const startCenter = 3 * STEP + CARD_WIDTH / 2;
    const startX = containerW / 2 - startCenter;

    // Final target position: slot 45 + jitter
    const finalCenter = WIN_SLOT_INDEX * STEP + CARD_WIDTH / 2 + jitter;
    const targetX = containerW / 2 - finalCenter;

    let startTime = performance.now();
    let lastCrossedSlot = -1;

    // Custom CS:GO unboxing deceleration curve:
    const csgoEaseOut = (t: number): number => {
      return 1 - Math.pow(1 - t, 4.2); // Smoother, longer tail
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / DURATION_MS);
      const eased = csgoEaseOut(progress);

      const currentX = startX + (targetX - startX) * eased;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${currentX}px, 0, 0)`;
      }

      // Determine which slot is currently passing the center line
      const centerDistFromTrackStart = containerW / 2 - currentX;
      const currentSlot = Math.floor(centerDistFromTrackStart / STEP);

      if (currentSlot !== lastCrossedSlot && currentSlot >= 0 && currentSlot < TOTAL_SLOTS) {
        if (lastCrossedSlot >= 0 && trackRef.current) {
          trackRef.current.children[lastCrossedSlot]?.classList.remove("passing-glow");
        }
        if (trackRef.current) {
          trackRef.current.children[currentSlot]?.classList.add("passing-glow");
        }
        lastCrossedSlot = currentSlot;
        setNeedleTick(true);
        setTimeout(() => setNeedleTick(false), 40);

        const currentSec = reelItems[currentSlot]?.sector;
        if (currentSec) {
          onTick?.(currentSec.index);
        }

        if (audio) {
          const speedFactor = Math.max(0.08, 1 - progress);
          playCsgoTick(speedFactor);
        }
      }

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        if (trackRef.current) {
          Array.from(trackRef.current.children).forEach(c => c.classList.remove("passing-glow"));
        }
        if (audio) {
          playCsgoSettle();
        }
        onSettle?.(targetIndex);
      }
    };

    const timerId = setTimeout(() => {
      setIsSpinning(true);
      startTime = performance.now();
      animId = requestAnimationFrame(animate);
    }, 0);

    return () => {
      clearTimeout(timerId);
      cancelAnimationFrame(animId);
    };
  }, [spinId, targetIndex, sectors, audio, reducedMotion, onSettle, onTick, centerSlot, reelItems]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none overflow-hidden border border-line-strong bg-surface/80 p-2 sm:p-4 ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="flex w-full items-center justify-between border-b border-line pb-2.5 mb-3 text-[10px] font-mono tracking-wider text-muted">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isSpinning ? "bg-fg animate-ping" : "bg-fg/50"}`} />
          <span className="text-fg font-bold uppercase">SECTOR ROULETTE</span>
        </div>
        <div className="flex items-center gap-3">
          <span>CONTAINER: 18 SECTORS</span>
          <span className="text-subtle hidden sm:inline">PROBABILITY: UNIFORM SEED</span>
        </div>
      </div>

      {/* The Reel Viewport */}
      <div className="relative w-full h-[180px] sm:h-[200px] overflow-hidden bg-bg/90 border border-line flex items-center">
        {/* Subtle Horizontal Scanlines for Counter-Strike Tactical Feel */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-10 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.6)_50%)] bg-[length:100%_4px]"
          aria-hidden="true"
        />

        {/* Center Vertical Target Needle */}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 bottom-0 z-30 w-[2px] -translate-x-1/2 bg-fg shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-transform duration-75 ${
            needleTick ? "scale-y-110 brightness-200 shadow-[0_0_30px_rgba(255,255,255,1)]" : ""
          }`}
        >
          {/* Top Pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-[8px] border-x-transparent border-t-[12px] border-t-fg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          {/* Bottom Pointer */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-[8px] border-x-transparent border-b-[12px] border-b-fg drop-shadow-[0_-2px_4px_rgba(0,0,0,0.8)]" />
        </div>

        {/* Vignette Shadow Gradients on Left and Right edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 sm:w-24 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 sm:w-24 bg-gradient-to-l from-bg via-bg/80 to-transparent" />

        {/* Scrolling Strip */}
        <div
          ref={trackRef}
          className="flex items-center gap-[10px] will-change-transform h-full pl-4"
          style={{ width: "max-content" }}
        >
          {reelItems.map((item) => {
            const isWinner = !isSpinning && item.slot === WIN_SLOT_INDEX && landedIndex !== null;
            return (
              <div
                key={item.key}
                style={{ width: `${CARD_WIDTH}px` }}
                className={`relative shrink-0 h-[154px] sm:h-[168px] flex flex-col justify-between border bg-surface/90 p-3 transition-all duration-300 ${
                  isWinner
                    ? "border-fg scale-[1.04] shadow-[0_0_24px_rgba(255,255,255,0.5)] z-20 bg-fg/10"
                    : `${item.rarity.borderClass} opacity-85 hover:opacity-100`
                }`}
              >
                {/* Top Sector Number & Rarity Label */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-fg">
                    #{String(item.sector.index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-bold text-[9px] uppercase tracking-wider"
                    style={{ color: item.rarity.color }}
                  >
                    {item.rarity.tier === "GOLD" ? "★ SPECIAL" : item.rarity.tier}
                  </span>
                </div>

                {/* Center Sector Name with Bold Grotesk Typography */}
                <div className="my-auto flex flex-col gap-1 text-center px-1">
                  <span className="display text-xs sm:text-sm font-bold uppercase leading-tight tracking-tight text-fg line-clamp-2">
                    {item.sector.label}
                  </span>
                  <span className="text-[9px] font-mono text-muted uppercase tracking-wider">
                    {item.sector.id}
                  </span>
                </div>

                {/* Bottom Color Rarity Bar (CS:GO Weapon Skin Style) */}
                <div className="w-full flex flex-col gap-1">
                  <div
                    className="h-1.5 w-full rounded-xs transition-all"
                    style={{
                      backgroundColor: item.rarity.color,
                      boxShadow: isWinner ? `0 0 10px ${item.rarity.color}` : "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reel Bottom Trigger Bar */}
      <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">
            {isSpinning ? t("spinning") : landedIndex !== null ? `${t("target_lock")}: #${String(landedIndex + 1).padStart(2, "0")} ${sectors[landedIndex]?.label.toUpperCase()}` : t("ready_to_spin")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => !disabled && !isSpinning && onSpinRequest?.()}
          disabled={disabled || isSpinning}
          className="relative group overflow-hidden px-8 py-2.5 bg-fg text-bg font-sans font-bold text-sm tracking-wider uppercase transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200"
        >
          <span className="relative z-10 flex items-center gap-2">
            {isSpinning ? t("spinning") : t("spin_btn")}
            <span className="font-mono text-[10px] opacity-70 border border-bg/40 px-1 py-0.5">SPACE</span>
          </span>
        </button>
      </div>
    </div>
  );
}


