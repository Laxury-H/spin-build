"use client";

import { useRouter } from "next/navigation";
import type { Idea } from "@/types";
import { useSpin } from "@/lib/store";
import { IdeaResult } from "@/components/idea/IdeaResult";

export function IdeaClientView({ idea }: { idea: Idea }) {
  const router = useRouter();
  const loadIdea = useSpin((s) => s.loadIdea);

  const handleOpenInLab = () => {
    loadIdea(idea);
    router.push("/");
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-2 border border-line text-fg font-medium">
              Ý TƯỞNG ĐÃ LƯU / CHIA SẺ
            </span>
            <span>·</span>
            <span>SEED: #{idea.recipe.seed}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-fg uppercase tracking-tight">
            {idea.concept.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenInLab}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-fg text-bg font-bold text-xs uppercase tracking-tight hover:opacity-90 transition-all cursor-pointer shadow-sm"
        >
          <span>←</span>
          <span>MỞ TRONG PHÒNG THÍ NGHIỆM</span>
        </button>
      </div>

      <IdeaResult
        idea={idea}
        mode="view"
        onOpenInLab={handleOpenInLab}
      />
    </div>
  );
}
