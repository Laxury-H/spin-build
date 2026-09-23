"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { Sector } from "@/types";
import {
  planSpin,
  indexFromAngle,
  angleForIndex,
  mod,
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
  const lastSpinIdRef = useRef<number | null>(null);

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
    if (activeIndex !== undefined && activeIndex !== null) {
      setActiveSectorIndex(activeIndex);
      lastActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

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
      setActiveSectorIndex(targetIndex);
      if (audio) playSettle();
      onSettle?.(targetIndex);
      return;
    }

    // Plan spin animation
    const plan: SpinPlan = planSpin({
      fromAngle: currentAngleRef.current,
      targetIndex,
      sectorCount,
      velocity: Math.abs(dragVelocityRef.current) > FLICK_THRESHOLD ? dragVelocityRef.current : 0,
      minTurns: 4,
    });

    let startTime: number | null = null;
    let animId: number;

    const frame = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      if (elapsed >= plan.durationMs) {
        currentAngleRef.current = plan.toAngle;
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${plan.toAngle}deg)`;
        }
        setActiveSectorIndex(targetIndex);
        if (audio) playSettle();
        onSettle?.(targetIndex);
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
        setActiveSectorIndex(idx);
        onTick?.(idx);
        if (audio) playTick();
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [spinId, targetIndex, sectorCount, reducedMotion, audio, onSettle, onTick]);

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
      setActiveSectorIndex(idx);
      if (audio) playTick(0.8);
      onTick?.(idx);
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

  // SVG Geometry
  const size = 600;
  const center = size / 2;
  const radius = 270;
  const innerRadius = 80;

  // Pre-generate sector paths
  const sectorWedges = useMemo(() => {
    return sectors.map((sector, i) => {
      // Sector i centered at i * S
      const startDeg = i * sectorDegrees - sectorDegrees / 2;
      const endDeg = i * sectorDegrees + sectorDegrees / 2;
      const midDeg = i * sectorDegrees;

      const startRad = ((startDeg - 90) * Math.PI) / 180;
      const endRad = ((endDeg - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      // Label positioning along radial centerline
      const labelRad = ((midDeg - 90) * Math.PI) / 180;
      const labelDist = radius * 0.64;
      const lx = center + labelDist * Math.cos(labelRad);
      const ly = center + labelDist * Math.sin(labelRad);

      // Text rotation: ensure text is always right-side up and readable
      // Right half (0 <= midDeg <= 180): ray angle midDeg - 90 is between -90 and +90 (upright).
      // Left half (180 < midDeg < 360): ray angle flipped by 180 (midDeg + 90) so text is upright.
      const isLeftSide = midDeg > 180 && midDeg < 360;
      const textRot = isLeftSide ? midDeg + 90 : midDeg - 90;

      return {
        id: sector.id,
        index: i,
        label: sector.label,
        icon: sector.icon,
        labelVi: sector.labelVi,
        pathData,
        lx,
        ly,
        textRot,
        midDeg,
      };
    });
  }, [sectors, sectorDegrees, center, radius]);

  // Outer bezel ticks
  const bezelTicks = useMemo(() => {
    const ticks = [];
    const tickCount = 72; // Fine degree ticks
    for (let i = 0; i < tickCount; i++) {
      const deg = (i * 360) / tickCount;
      const isSectorBound = i % (tickCount / sectorCount) === 0;
      const rad = ((deg - 90) * Math.PI) / 180;
      const rOuter = radius + 18;
      const rInner = isSectorBound ? radius + 4 : radius + 10;
      const x1 = center + rOuter * Math.cos(rad);
      const y1 = center + rOuter * Math.sin(rad);
      const x2 = center + rInner * Math.cos(rad);
      const y2 = center + rInner * Math.sin(rad);
      ticks.push({ x1, y1, x2, y2, isSectorBound, key: i });
    }
    return ticks;
  }, [center, radius, sectorCount]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none aspect-square flex items-center justify-center ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: disabled ? "not-allowed" : "grab" }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible drop-shadow-[0_0_60px_rgba(99,102,241,0.08)]"
      >
        {/* Background dark disk */}
        <circle cx={center} cy={center} r={radius + 22} fill="var(--surface)" />
        <circle cx={center} cy={center} r={radius + 20} fill="none" stroke="var(--line-strong)" strokeWidth="1" />

        {/* Outer bezel graduated ticks */}
        {bezelTicks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isSectorBound ? "var(--fg)" : "var(--line)"}
            strokeWidth={tick.isSectorBound ? 1.5 : 1}
          />
        ))}

        {/* Rotating Wheel Group */}
        <g
          ref={wheelRef}
          style={{
            transformOrigin: `${center}px ${center}px`,
            willChange: "transform",
          }}
        >
          {sectorWedges.map((w) => {
            const isActive = activeSectorIndex === w.index;
            const wedgeFill = isActive 
              ? "var(--fg)" 
              : w.index % 2 === 0 
                ? "var(--surface)" 
                : "var(--surface-2)";

            return (
              <g key={w.id} className="transition-colors duration-100">
                {/* Wedge background */}
                <path
                  d={w.pathData}
                  fill={wedgeFill}
                  stroke="var(--line)"
                  strokeWidth="1"
                />

                {/* Sector Text & Icon: Upright, centered and readable */}
                <g transform={`translate(${w.lx}, ${w.ly}) rotate(${w.textRot})`}>
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? "var(--bg)" : "var(--fg)"}
                    className="font-mono font-bold select-none pointer-events-none tracking-wider text-[10px] uppercase"
                  >
                    {w.icon ? `${w.icon} ` : ""}{w.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Hairline inner sector separator circle */}
          <circle cx={center} cy={center} r={innerRadius + 4} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        </g>

        {/* Fixed 12 o'clock Selector Indicator */}
        <g className="pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {/* Top needle pointing down into the wheel */}
          <polygon
            points={`${center - 8},${center - radius - 26} ${center + 8},${center - radius - 26} ${center},${center - radius + 6}`}
            fill="var(--fg)"
          />
          <circle cx={center} cy={center - radius - 26} r="3" fill="var(--bg)" />
          {/* Hairline crosshair register marks */}
          <line x1={center} y1={center - radius - 35} x2={center} y2={center - radius - 15} stroke="var(--fg)" strokeWidth="2" />
        </g>

        {/* Center Circular HUB Button */}
        <g
          onClick={handleHubClick}
          className="cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="Quay ý tưởng ngay"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleHubClick();
            }
          }}
        >
          {/* Outer hub bevel ring */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="var(--fg)"
            className="transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-[0.96]"
            style={{ transformOrigin: `${center}px ${center}px` }}
          />
          <circle
            cx={center}
            cy={center}
            r={innerRadius - 4}
            fill="var(--fg)"
            stroke="var(--bg)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          {/* Hub Icon & Text */}
          <text
            x={center}
            y={center - 12}
            textAnchor="middle"
            dominantBaseline="central"
            className="select-none pointer-events-none text-[20px]"
          >
            🎲
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--bg)"
            className="font-sans font-black tracking-tight text-[18px] uppercase select-none pointer-events-none"
          >
            QUAY
          </text>
          <text
            x={center}
            y={center + 26}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--bg)"
            className="font-mono font-medium text-[8.5px] uppercase select-none pointer-events-none opacity-80"
          >
            SPIN [SPACE]
          </text>
        </g>
      </svg>
    </div>
  );
}
