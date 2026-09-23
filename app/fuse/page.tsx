"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { fuseIdeas, spinIdea } from "@/lib/generator";
import type { Idea } from "@/types";
import { IdeaResult } from "@/components/idea/IdeaResult";
import { Button } from "@/components/ui/Button";

export default function FusePage() {
  const router = useRouter();
  const history = useSpin((s) => s.history);
  const loadIdea = useSpin((s) => s.loadIdea);

  const [parentA, setParentA] = useState<Idea | null>(() => {
    return history[0]?.idea ?? spinIdea({ chaos: 40, region: "GLOBAL" });
  });

  const [parentB, setParentB] = useState<Idea | null>(() => {
    return history[1]?.idea ?? spinIdea({ chaos: 70, region: "GLOBAL" });
  });

  const [fusedResult, setFusedResult] = useState<Idea | null>(null);

  const handleRollRandomA = () => {
    setParentA(spinIdea({ chaos: Math.floor(Math.random() * 80) + 10, region: "GLOBAL" }));
  };

  const handleRollRandomB = () => {
    setParentB(spinIdea({ chaos: Math.floor(Math.random() * 80) + 10, region: "GLOBAL" }));
  };

  const handleFuse = () => {
    if (!parentA || !parentB) return;
    const hybrid = fuseIdeas(parentA, parentB);
    setFusedResult(hybrid);
  };

  const handleOpenInLab = () => {
    if (!fusedResult) return;
    loadIdea(fusedResult);
    router.push("/");
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-line pb-4">
        <span className="text-xs font-mono text-muted uppercase">PHÒNG THÍ NGHIỆM LAI TẠO Ý TƯỞNG</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-fg uppercase tracking-tight">
          GHÉP 2 Ý TƯỞNG (HYBRID)
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Kết hợp bộ gen của 2 sản phẩm: lấy <strong className="text-fg">Lĩnh vực & Khách hàng</strong> từ Ý tưởng A, ghép với <strong className="text-fg">Cơ chế & Yếu tố đột phá</strong> từ Ý tưởng B để tạo ra sản phẩm lai hoàn toàn mới.
        </p>
      </div>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Parent A */}
        <div className="p-5 rounded-2xl border border-line bg-surface/90 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-xs font-mono font-bold text-indigo-400">
              Ý TƯỞNG A (LĨNH VỰC & KHÁCH HÀNG)
            </span>
            <Button size="sm" variant="ghost" onClick={handleRollRandomA} className="text-xs font-mono">
              🎲 ĐỔI NGẪU NHIÊN
            </Button>
          </div>

          {parentA ? (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-muted">
                SEED: #{parentA.recipe.seed}
              </span>
              <h3 className="font-bold text-xl text-fg">
                {parentA.concept.name}
              </h3>
              <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                &ldquo;{parentA.concept.pitch}&rdquo;
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted font-mono">
              CHỌN HOẶC QUAY Ý TƯỞNG A
            </div>
          )}

          <div className="font-mono text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg truncate">
            {parentA?.dna.domain.label} × {parentA?.dna.target.label}
          </div>
        </div>

        {/* Parent B */}
        <div className="p-5 rounded-2xl border border-line bg-surface/90 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-xs font-mono font-bold text-emerald-400">
              Ý TƯỞNG B (CƠ CHẾ & ĐỘT PHÁ)
            </span>
            <Button size="sm" variant="ghost" onClick={handleRollRandomB} className="text-xs font-mono">
              🎲 ĐỔI NGẪU NHIÊN
            </Button>
          </div>

          {parentB ? (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-muted">
                SEED: #{parentB.recipe.seed}
              </span>
              <h3 className="font-bold text-xl text-fg">
                {parentB.concept.name}
              </h3>
              <p className="text-xs text-muted line-clamp-3 leading-relaxed">
                &ldquo;{parentB.concept.pitch}&rdquo;
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted font-mono">
              CHỌN HOẶC QUAY Ý TƯỞNG B
            </div>
          )}

          <div className="font-mono text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg truncate">
            {parentB?.dna.mechanic.short} × {parentB?.dna.chaos.short}
          </div>
        </div>
      </div>

      {/* Fuse Button */}
      <div className="flex justify-center">
        <Button
          variant="solid"
          size="lg"
          onClick={handleFuse}
          className="px-8 py-3.5 text-base font-extrabold tracking-tight shadow-xl"
        >
          🧬 TẠO Ý TƯỞNG LAI (FUSE) →
        </Button>
      </div>

      {/* Fused Result */}
      {fusedResult && (
        <div className="mt-6 pt-6 border-t border-line flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-fg font-bold tracking-wider">
              KẾT QUẢ LAI TẠO (HYBRID RESULT)
            </span>
            <span className="text-xs font-mono text-muted">
              {parentA?.concept.name} × {parentB?.concept.name}
            </span>
          </div>

          <IdeaResult
            idea={fusedResult}
            mode="view"
            eyebrow={`Ý TƯỞNG LAI // ${parentA?.concept.name} × ${parentB?.concept.name}`}
            onOpenInLab={handleOpenInLab}
          />
        </div>
      )}
    </div>
  );
}
