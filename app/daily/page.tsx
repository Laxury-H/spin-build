"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { dailyIdea } from "@/lib/generator";
import { dailyPlan } from "@/lib/generator/daily";
import { useSpin } from "@/lib/store";
import { IdeaResult } from "@/components/idea/IdeaResult";

export default function DailyPage() {
  const router = useRouter();
  const loadIdea = useSpin((s) => s.loadIdea);

  const plan = useMemo(() => dailyPlan(), []);
  const idea = useMemo(() => dailyIdea(), []);

  const handleOpenInLab = () => {
    loadIdea(idea);
    router.push("/");
  };

  const dayNumberPad = String(plan.number).padStart(4, "0");

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-line pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted uppercase">Ý TƯỞNG ĐỒNG BỘ TOÀN CẦU</span>
          <span className="text-xs font-mono text-fg font-bold">
            NGÀY: {plan.dateKey}
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-fg uppercase tracking-tight">
          Ý TƯỞNG HÔM NAY #{dayNumberPad}
        </h1>
        <p className="text-sm text-muted max-w-xl leading-relaxed">
          Mỗi ngày một ý tưởng độc đáo, được đồng bộ cho mọi người dùng trên toàn thế giới dựa trên xu hướng đang thịnh hành.
        </p>
      </div>

      {/* Idea Result View */}
      <IdeaResult
        idea={idea}
        mode="view"
        eyebrow={`Ý TƯỞNG NGÀY #${dayNumberPad}`}
        onOpenInLab={handleOpenInLab}
      />
    </div>
  );
}
