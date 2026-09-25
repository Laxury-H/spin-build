"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { Sector } from "@/types";
import {
  planSpin,
  indexFromAngle,
  angleForIndex,
  pointerAngle,
  FLICK_THRESHOLD,
  MAX_ANGULAR_VELOCITY,
  type SpinPlan,
} from "./physics";
import { playTick, playSettle } from "./audio";

export interface RouletteWheelProps {
  sectors: readonly Sector[];
  spinId: number;
  targetIndex: number | null;
  onSettle?: (index: number) => void;
  onTick?: (index: number) => void;
  onSpinRequest?: (opts?: { velocity?: number }) => void;
  activeIndex?: number | null;
  audio?: boolean;
  reducedMotion?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RouletteWheel({
  sectors,
  spinId,
  targetIndex,
  onSettle,
  onTick,
  onSpinRequest,
  activeIndex,
  audio = false,
  reducedMotion = false,
  disabled = false,
  className = "",
}: RouletteWheelProps) {
  const wheelRef = useRef<SVGGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live rotation tracking
  const currentAngleRef = useRef(0);
  const lastActiveIndexRef = useRef<number | null>(null);
  const [activeSectorIndex, setActiveSectorIndex] = useState<number | null>(activeIndex ?? null);
  const [needleTick, setNeedleTick] = useState(false);
  // Per-sector nodes, repainted directly during motion (no React render per tick).
  const wedgeEls = useRef<(SVGPathElement | null)[]>([]);
  const labelEls = useRef<(SVGTextElement | null)[]>([]);
  const numEls = useRef<(SVGTextElement | null)[]>([]);
  const paint = useCallback((idx: number | null) => {
    wedgeEls.current.forEach((el, i) => {
        if (i === idx) {
          el?.classList.add("passing-wedge");
          el?.setAttribute("fill", "var(--fg)");
        } else {
          el?.classList.remove("passing-wedge");
          el?.setAttribute("fill", "transparent");
        }
      });
    labelEls.current.forEach((el, i) => el?.setAttribute("fill", i === idx ? "var(--bg)" : "var(--fg)"));
    numEls.current.forEach((el, i) => el?.setAttribute("fill", i === idx ? "var(--bg)" : "var(--muted)"));
  }, []);
  // Only a *change* of spinId spins; mounting with an old id must not replay it.
  const lastSpinIdRef = useRef<number | null>(spinId);
  const animatingRef = useRef(false);
  // Latest callbacks/flags, read inside the rAF loop so prop changes never restart a spin.
  const live = useRef({ onSettle, onTick, audio });
  useEffect(() => {
    live.current = { onSettle, onTick, audio };
  });

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartAngleRef = useRef(0);
  const dragStartWheelAngleRef = useRef(0);
  const dragLastTimeRef = useRef(0);
  const dragLastAngleRef = useRef(0);
  const dragVelocityRef = useRef(0);

  const sectorCount = sectors.length;
  const sectorDegrees = 360 / sectorCount;

  // Sync external activeIndex if provided and not spinning
  useEffect(() => {
    if (activeIndex === undefined || activeIndex === null || animatingRef.current) return;
    setActiveSectorIndex(activeIndex);
    paint(activeIndex);
    lastActiveIndexRef.current = activeIndex;
    // Rest the disc on that sector (e.g. after remounting on the lab page).
    if (indexFromAngle(currentAngleRef.current, sectorCount) !== activeIndex) {
      currentAngleRef.current = angleForIndex(activeIndex, sectorCount);
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${currentAngleRef.current}deg)`;
    }
  }, [activeIndex, sectorCount, paint]);

  // Handle spinId changes
  useEffect(() => {
    if (spinId === 0 || spinId === lastSpinIdRef.current || targetIndex === null) {
      return;
    }
    lastSpinIdRef.current = spinId;

    if (reducedMotion) {
      const finalAngle = angleForIndex(targetIndex, sectorCount);
      currentAngleRef.current = finalAngle;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${finalAngle}deg)`;
      }
      paint(targetIndex);
      lastActiveIndexRef.current = targetIndex;
      live.current.onTick?.(targetIndex);
      // Reduced motion: no rotation, just a short beat before settling.
      const t = setTimeout(() => {
        setActiveSectorIndex(targetIndex);
        if (live.current.audio) playSettle();
        live.current.onSettle?.(targetIndex);
      }, 180);
      return () => clearTimeout(t);
    }

    // Plan spin animation
    const plan: SpinPlan = planSpin({
      fromAngle: currentAngleRef.current,
      targetIndex,
      sectorCount,
      velocity: Math.abs(dragVelocityRef.current) > FLICK_THRESHOLD ? dragVelocityRef.current : 0,
      minTurns: 4,
    });
    dragVelocityRef.current = 0; // a flick applies to one spin only

    animatingRef.current = true;
    let startTime: number | null = null;
    let animId: number;

    const frame = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      if (elapsed >= plan.durationMs) {
        animatingRef.current = false;
        currentAngleRef.current = plan.toAngle;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${plan.toAngle}deg)`;
        }
        setActiveSectorIndex(targetIndex);
        paint(targetIndex);
        if (lastActiveIndexRef.current !== targetIndex) {
          lastActiveIndexRef.current = targetIndex;
          live.current.onTick?.(targetIndex);
          setNeedleTick(true);
          setTimeout(() => setNeedleTick(false), 50);
        }
        if (live.current.audio) playSettle();
        live.current.onSettle?.(targetIndex);
        return;
      }

      const currentAngle = plan.angleAt(elapsed);
      currentAngleRef.current = currentAngle;
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentAngle}deg)`;
      }

      const idx = indexFromAngle(currentAngle, sectorCount);
      if (idx !== lastActiveIndexRef.current) {
        lastActiveIndexRef.current = idx;
        paint(idx);
        live.current.onTick?.(idx);
        setNeedleTick(true);
        setTimeout(() => setNeedleTick(false), 50);
        if (live.current.audio) playTick();
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      animatingRef.current = false;
    };
  }, [spinId, targetIndex, sectorCount, reducedMotion, paint]);

  // Pointer drag & flick gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = pointerAngle(e.clientX - cx, e.clientY - cy);

    isDraggingRef.current = true;
    dragStartAngleRef.current = angle;
    dragStartWheelAngleRef.current = currentAngleRef.current;
    dragLastTimeRef.current = performance.now();
    dragLastAngleRef.current = angle;
    dragVelocityRef.current = 0;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const now = performance.now();
    const angle = pointerAngle(e.clientX - cx, e.clientY - cy);
    const dt = (now - dragLastTimeRef.current) / 1000;

    if (dt > 0.005) {
      let deltaAngle = angle - dragLastAngleRef.current;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      const vel = deltaAngle / dt;
      dragVelocityRef.current = Math.max(-MAX_ANGULAR_VELOCITY, Math.min(MAX_ANGULAR_VELOCITY, vel));
      dragLastTimeRef.current = now;
      dragLastAngleRef.current = angle;
    }

    let totalDelta = angle - dragStartAngleRef.current;
    if (totalDelta > 180) totalDelta -= 360;
    if (totalDelta < -180) totalDelta += 360;

    const newAngle = dragStartWheelAngleRef.current + totalDelta;
    currentAngleRef.current = newAngle;

    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${newAngle}deg)`;
    }

    const idx = indexFromAngle(newAngle, sectorCount);
    if (idx !== lastActiveIndexRef.current) {
      lastActiveIndexRef.current = idx;
      paint(idx);
      if (audio) playTick(0.8);
      onTick?.(idx);
      setNeedleTick(true);
      setTimeout(() => setNeedleTick(false), 50);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }

    if (Math.abs(dragVelocityRef.current) > FLICK_THRESHOLD) {
      onSpinRequest?.({ velocity: dragVelocityRef.current });
    }
  };

  const handleHubClick = useCallback(() => {
    if (disabled) return;
    onSpinRequest?.();
  }, [disabled, onSpinRequest]);

  // SVG geometry (viewBox units)
  const size = 600;
  const center = size / 2;
  const bezelOuter = 294;
  const radius = 256; // rotating disc
  const labelStart = 100;

  // Sector i is centered at i * S degrees (0° = 12 o'clock).
  const sectorWedges = useMemo(() => {
    return sectors.map((sector, i) => {
      const midDeg = i * sectorDegrees;
      const a = polar(center, radius, midDeg - sectorDegrees / 2);
      const b = polar(center, radius, midDeg + sectorDegrees / 2);
      const pathData = `M ${center} ${center} L ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y} Z`;
      const num = polar(center, radius - 18, midDeg);
      // Labels run along the radius; flip on the left half so they never read upside down.
      const flip = midDeg > 180;
      return { id: sector.id, index: i, label: sector.label, pathData, midDeg, flip, num };
    });
  }, [sectors, sectorDegrees, center]);

  // Static graduated bezel: fine every 2°, medium every 10°, long at sector bounds.
  const bezelTicks = useMemo(() => {
    const ticks: { x1: number; y1: number; x2: number; y2: number; kind: 0 | 1 | 2; key: number }[] = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const bound = Math.abs((deg + sectorDegrees / 2) % sectorDegrees) < 0.001;
      const kind: 0 | 1 | 2 = bound ? 2 : deg % 10 === 0 ? 1 : 0;
      const inner = kind === 2 ? bezelOuter - 26 : kind === 1 ? bezelOuter - 16 : bezelOuter - 10;
      const p1 = polar(center, bezelOuter - 2, deg);
      const p2 = polar(center, inner, deg);
      ticks.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, kind, key: deg });
    }
    return ticks;
  }, [sectorDegrees, center]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none aspect-square [container-type:inline-size] ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: disabled ? "default" : "grab" }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="block h-full w-full overflow-visible" aria-hidden="true">
        {/* Bezel */}
        <circle cx={center} cy={center} r={bezelOuter} fill="none" stroke="var(--line-strong)" strokeWidth="1" />
        {bezelTicks.map((t) => (
          <line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.kind === 0 ? "var(--line)" : t.kind === 1 ? "var(--line-strong)" : "var(--fg)"}
            strokeWidth={t.kind === 2 ? 1.25 : 1}
          />
        ))}

        {/* Rotating disc */}
        <g ref={wheelRef} style={{ transformOrigin: `${center}px ${center}px`, willChange: "transform" }}>
          <circle cx={center} cy={center} r={radius} fill="var(--bg)" stroke="var(--line-strong)" strokeWidth="1" />
          {sectorWedges.map((w) => {
            const active = activeSectorIndex === w.index;
            const pivot = center + (labelStart + radius - 32) / 2;
            return (
              <g key={w.id}>
                <path ref={(el) => { wedgeEls.current[w.index] = el; }} d={w.pathData} fill={active ? "var(--fg)" : "transparent"} stroke="var(--line)" strokeWidth="1" />
                <g transform={`rotate(${w.midDeg - 90} ${center} ${center})`}>
                  <text
                    ref={(el) => { labelEls.current[w.index] = el; }}
                    x={w.flip ? center + radius - 32 : center + labelStart}
                    y={center}
                    textAnchor={w.flip ? "end" : "start"}
                    dominantBaseline="central"
                    transform={w.flip ? `rotate(180 ${pivot} ${center})` : undefined}
                    fill={active ? "var(--bg)" : "var(--fg)"}
                    style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 500, letterSpacing: "0.09em" }}
                  >
                    {w.label}
                  </text>
                </g>
                <text
                  ref={(el) => { numEls.current[w.index] = el; }}
                  x={w.num.x}
                  y={w.num.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={active ? "var(--bg)" : "var(--muted)"}
                  transform={`rotate(${w.midDeg} ${w.num.x} ${w.num.y})`}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.04em" }}
                >
                  {String(w.index + 1).padStart(2, "0")}
                </text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r={labelStart - 8} fill="var(--bg)" stroke="var(--line-strong)" strokeWidth="1" />
        </g>

        {/* Fixed selector at 12 o'clock */}
        <g className={`pointer-events-none transition-all duration-75 ${needleTick ? "opacity-100" : "opacity-80"}`}>
          {needleTick && (
            <circle cx={center} cy={center - radius + 10} r="25" fill="url(#flashGrad)" />
          )}
          <defs>
            <radialGradient id="flashGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--fg)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--fg)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <line
            x1={center}
            y1={center - bezelOuter - 14}
            x2={center}
            y2={center - radius + 22}
            stroke="var(--fg)"
            strokeWidth="1.5"
          />
          <polygon
            points={`${center - 7},${center - bezelOuter - 14} ${center + 7},${center - bezelOuter - 14} ${center},${center - bezelOuter - 2}`}
            fill="var(--fg)"
          />
        </g>
      </svg>

      {/* Hub: a real button over the SVG center */}
      <button
        type="button"
        onClick={handleHubClick}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        aria-label="Spin"
        className="absolute left-1/2 top-1/2 flex aspect-square w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-fg text-bg outline-offset-4 transition-transform duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:cursor-default disabled:hover:scale-100"
      >
        <span className="font-sans text-[max(16px,6cqw)] font-semibold uppercase leading-none tracking-[-0.03em]">
          Spin
        </span>
        <span className="mt-[1.2cqw] font-mono text-[max(8px,1.6cqw)] uppercase tracking-[0.14em] opacity-60">
          Space
        </span>
      </button>
    </div>
  );
}

function polar(center: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  // Rounded so server and client render identical attributes (no hydration mismatch).
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(center + r * Math.cos(rad)), y: round(center + r * Math.sin(rad)) };
}
