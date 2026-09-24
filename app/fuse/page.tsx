"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpin } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { fuseIdeas, spinIdea } from "@/lib/generator";
import { flashInvert } from "@/lib/ui/invert";
import { prefersReducedMotion } from "@/lib/ui/motion";
import { cn } from "@/lib/ui/cn";
import type { Idea } from "@/types";
import { IdeaResult } from "@/components/idea/IdeaResult";
import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  "Học ngoại ngữ × Hẹn hò",
  "Khám phá âm nhạc × Game định vị",
  "Tài chính cá nhân × Đấu trường Multiplayer",
  "Ẩm thực địa phương × Game giải đố",
];

export default function FusePage() {
  const router = useRouter();
  const current = useSpin((s) => s.current);
  const chaos = useSpin((s) => s.chaos);
  const region = useSpin((s) => s.region);
  const trendPool = useSpin((s) => s.trends.trends);
  const loadIdea = useSpin((s) => s.loadIdea);

  const roll = () => spinIdea({ chaos, region, trendPool });

  // Default parents are rolled only on the client: random seeds must not differ between server and client HTML.
  const hydrated = useHydrated();
  const defaults = useMemo(() => {
    if (!hydrated) return null;
    const h = useSpin.getState().history;
    return {
      a: h[0]?.idea ?? spinIdea({ chaos: 40, region: "GLOBAL" }),
      b: h[1]?.idea ?? spinIdea({ chaos: 70, region: "GLOBAL" }),
    };
  }, [hydrated]);

  const [pickA, setA] = useState<Idea | null>(null);
  const [pickB, setB] = useState<Idea | null>(null);
  const a = pickA ?? defaults?.a ?? null;
  const b = pickB ?? defaults?.b ?? null;
  const [fused, setFused] = useState<Idea | null>(null);
  const [merging, setMerging] = useState(false);

  const fuse = () => {
    if (!a || !b) return;
    const result = fuseIdeas(a, b);
    if (prefersReducedMotion()) {
      setFused(result);
      return;
    }
    setFused(null);
    setMerging(true);
    setTimeout(() => {
      flashInvert(140);
      setFused(result);
      setMerging(false);
    }, 520);
  };

  const openInLab = () => {
    if (!fused) return;
    loadIdea(fused);
    router.push("/");
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-4">
        <span className="label text-muted">PHÒNG THÍ NGHIỆM LAI TẠO // FUSION CHAMBER</span>
        <h1 className="display text-[clamp(2.6rem,7vw,6.5rem)] tracking-tight">
          A × B
          <br />= HYBRID MỚI.
        </h1>
        <p className="max-w-[65ch] text-sm leading-relaxed text-muted">
          Kế thừa Lĩnh vực & Đối tượng từ ý tưởng A, phối ngẫu cùng Cơ chế & Biến số Chaos từ ý tưởng B.
          Hai hạt giống va chạm để tổng hợp nên một đột phá độc bản.
        </p>
      </header>

      {a && b ? (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <Parent
            tag="A"
            idea={a}
            detail={`${a.dna.domain.short} × ${a.dna.target.short}`}
            merging={merging}
            side="left"
            onReroll={() => setA(roll())}
            onUseCurrent={
              current && current.id !== a.id ? () => setA(current) : undefined
            }
          />
          <div
            className="display flex items-center justify-center text-5xl text-subtle"
            aria-hidden="true"
          >
            ×
          </div>
          <Parent
            tag="B"
            idea={b}
            detail={`${b.dna.mechanic.short} × ${b.dna.chaos.short}`}
            merging={merging}
            side="right"
            onReroll={() => setB(roll())}
            onUseCurrent={
              current && current.id !== b.id ? () => setB(current) : undefined
            }
          />
        </div>
      ) : (
        <div
          className="grid h-72 grid-cols-1 gap-4 md:grid-cols-2"
          aria-busy="true"
        >
          <div className="border border-line bg-surface" />
          <div className="border border-line bg-surface" />
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <Button
          variant="solid"
          size="lg"
          onClick={fuse}
          disabled={merging || !a || !b}
          className="min-w-64 font-bold tracking-wider"
        >
          {fused ? "LAI TẠO LẠI (RE-FUSE)" : "KÍCH HOẠT LAI TẠO (FUSE)"}
        </Button>
        <p className="label text-center text-subtle text-xs">
          {EXAMPLES.join("  ·  ")}
        </p>
      </div>

      {fused && (
        <section
          className="enter border-t border-line pt-8"
          aria-label="Kết quả lai tạo"
        >
          <IdeaResult
            idea={fused}
            mode="view"
            eyebrow={`FUSION // ${fused.fusion?.parents.join(" × ") ?? "A × B"}`}
            onOpenInLab={openInLab}
          />
        </section>
      )}
    </main>
  );
}

function Parent({
  tag,
  idea,
  detail,
  merging,
  side,
  onReroll,
  onUseCurrent,
}: {
  tag: string;
  idea: Idea;
  detail: string;
  merging: boolean;
  side: "left" | "right";
  onReroll: () => void;
  onUseCurrent?: () => void;
}) {
  return (
    <article
      className={cn(
        "flex flex-col justify-between gap-6 border border-line bg-surface/30 p-6 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]",
        merging &&
          (side === "left"
            ? "md:translate-x-[55%] md:rotate-[-3deg]"
            : "md:-translate-x-[55%] md:rotate-[3deg]"),
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="label flex justify-between text-muted">
          <span className="text-fg font-bold tracking-wider">Ý TƯỞNG {tag}</span>
          <span className="font-mono">#{idea.number}</span>
        </div>
        <h2 className="text-2xl font-bold uppercase leading-tight tracking-tight">
          {idea.concept.name}
        </h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
          “{idea.concept.pitch}”
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <p className="label border-t border-line pt-3 text-subtle font-mono text-xs">{detail}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onReroll}>
            Đổi {tag} ngẫu nhiên
          </Button>
          {onUseCurrent && (
            <Button size="sm" variant="ghost" onClick={onUseCurrent}>
              Dùng ý tưởng từ Lab
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
