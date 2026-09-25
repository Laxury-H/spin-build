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
    const t1 = setTimeout(() => setStep(1), 380); // sector stamped, genes start decoding
    const t2 = setTimeout(() => setStep(2), 1100); // idea number stamps in
    const t3 = setTimeout(onComplete, 1650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const rows: [string, string][] = [
    ["Đối tượng", idea.dna.target.short],
    ["Cơ chế", idea.dna.mechanic.short],
    ["Xu hướng", idea.dna.trend.title.toUpperCase()],
    ["Điểm dị", idea.dna.chaos.short],
    ["Ràng buộc", idea.dna.constraint.short],
  ];

  return (
    <div
      onClick={onSkip}
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-30 flex cursor-pointer select-none flex-col items-center justify-center bg-bg px-4"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="label text-muted">Dừng tại // {String(sector?.index ?? 1).padStart(2, "0")}</span>
          <h2 className="display enter text-[clamp(2.5rem,7vw,5rem)]">{sector?.label ?? "—"}</h2>
          <span className="label text-muted">{idea.dna.domain.short}</span>
        </div>

        <dl className={`w-full border-t border-line text-left transition-opacity duration-150 ${step >= 1 ? "opacity-100" : "opacity-0"}`}>
          {rows.map(([k, v], i) => (
            <div key={k} className="label flex justify-between gap-4 border-b border-line py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-fg break-words text-right">
                {step >= 1 ? <span>{v}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        <span className={`label text-fg transition-opacity ${step >= 2 ? "opacity-100" : "opacity-0"}`}>
          Đã tạo ý tưởng // #{idea.number}
        </span>
        <span className="label text-subtle">Bấm hoặc SPACE để bỏ qua</span>
      </div>
    </div>
  );
}
