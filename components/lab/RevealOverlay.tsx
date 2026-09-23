"use client";

import { useEffect, useState } from "react";
import type { Idea } from "@/types";
import { SECTOR_BY_ID } from "@/data/sectors";
import { ScrambleText } from "@/components/ui/ScrambleText";

export function RevealOverlay({
  idea,
  onComplete,
  onSkip,
}: {
  idea: Idea;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<number>(0);
  const sector = SECTOR_BY_ID[idea.dna.domain.sector];

  useEffect(() => {
    // Step 0: Initial sector expansion
    const t1 = setTimeout(() => setStep(1), 350);
    // Step 1: Genes decoding
    const t2 = setTimeout(() => setStep(2), 750);
    // Step 2: Stamp in & finish
    const t3 = setTimeout(() => {
      setStep(3);
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      onClick={onSkip}
      className="absolute inset-0 z-30 bg-bg/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="flex flex-col items-center text-center max-w-xl gap-4">
        {/* Sector Stamped Headline */}
        <div className="flex flex-col items-center gap-1">
          <span className="label text-muted tracking-widest text-xs">
            SECTOR LOCKED // 0{sector?.index || 1}
          </span>
          <h2 className="display text-5xl sm:text-7xl font-extrabold uppercase tracking-tighter text-fg animate-in zoom-in-95 duration-200">
            {sector?.label || "SYSTEM"}
          </h2>
          <span className="font-mono text-sm font-semibold tracking-wider text-muted uppercase">
            {idea.dna.domain.label}
          </span>
        </div>

        {/* Gene Scramble Feed */}
        {step >= 1 && (
          <div className="w-full max-w-sm flex flex-col divide-y divide-line/40 border border-line bg-surface p-3 mt-4 text-xs font-mono text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="py-1.5 flex justify-between">
              <span className="text-muted">TARGET</span>
              <span className="text-fg font-semibold">
                <ScrambleText text={idea.dna.target.short} />
              </span>
            </div>
            <div className="py-1.5 flex justify-between">
              <span className="text-muted">MECHANIC</span>
              <span className="text-fg font-semibold">
                <ScrambleText text={idea.dna.mechanic.short} />
              </span>
            </div>
            <div className="py-1.5 flex justify-between">
              <span className="text-muted">TREND</span>
              <span className="text-fg font-semibold truncate max-w-[200px]">
                <ScrambleText text={idea.dna.trend.title.toUpperCase()} />
              </span>
            </div>
            <div className="py-1.5 flex justify-between">
              <span className="text-muted">CHAOS</span>
              <span className="text-fg font-semibold">
                <ScrambleText text={idea.dna.chaos.short} />
              </span>
            </div>
            <div className="py-1.5 flex justify-between">
              <span className="text-muted">CONSTRAINT</span>
              <span className="text-fg font-semibold">
                <ScrambleText text={idea.dna.constraint.short} />
              </span>
            </div>
          </div>
        )}

        {/* Footer skip prompt */}
        <div className="mt-6 text-[10px] font-mono text-muted tracking-widest uppercase">
          CLICK OR PRESS SPACE TO SKIP REVEAL
        </div>
      </div>
    </div>
  );
}
