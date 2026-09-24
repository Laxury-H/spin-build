"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DnaKey, Idea } from "@/types";
import { DNA_KEYS, DIFFICULTIES, ESTIMATES, TREND_SOURCE_LABEL } from "@/types";
import { useSpin } from "@/lib/store";
import { SECTOR_BY_ID } from "@/data/sectors";
import { useOverlay } from "@/lib/ui/dialogs";
import { toast } from "@/lib/ui/toast";
import { cn } from "@/lib/ui/cn";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Button } from "@/components/ui/Button";
import { LockIcon, ArrowRightIcon } from "@/components/ui/icons";
import { playLockClick } from "@/components/roulette/audio";
import { BuildBriefDialog } from "./BuildBriefDialog";
import { ShareDialog } from "./ShareDialog";
import { MutateMenu } from "./MutateMenu";

export interface IdeaResultProps {
  idea: Idea;
  mode: "lab" | "view";
  revealKey?: string | number;
  onOpenInLab?: () => void;
  className?: string;
  eyebrow?: string;
}

const GENE_LABEL: Record<DnaKey, string> = {
  domain: "LĨNH VỰC",
  target: "ĐỐI TƯỢNG MỤC TIÊU",
  mechanic: "CƠ CHẾ CỐT LÕI",
  trend: "XU HƯỚNG CÔNG NGHỆ",
  chaos: "BIẾN SỐ ĐỘT PHÁ (CHAOS)",
  constraint: "RÀNG BUỘC KỸ THUẬT",
};

const DIFFICULTY_VI: Record<string, string> = { EASY: "DỄ", MEDIUM: "VỪA", HARD: "KHÓ", UNHINGED: "ĐIÊN RỒ" };
const ESTIMATE_VI: Record<string, string> = { "3 HOURS": "3 GIỜ", "1 DAY": "1 NGÀY", WEEKEND: "CUỐI TUẦN", "1 WEEK": "1 TUẦN" };

function geneValue(idea: Idea, key: DnaKey): { value: string; detail: string } {
  const d = idea.dna;
  switch (key) {
    case "domain":
      return { value: d.domain.short, detail: `Phân khu: ${SECTOR_BY_ID[d.domain.sector]?.label ?? d.domain.sector}` };
    case "target":
      return { value: d.target.short, detail: d.target.context };
    case "mechanic":
      return { value: d.mechanic.short, detail: d.mechanic.verb };
    case "trend": {
      const sources = (d.trend.sources?.length ? d.trend.sources : [d.trend.source]).map((s) => TREND_SOURCE_LABEL[s]);
      return { value: d.trend.title.toUpperCase(), detail: `Nguồn: ${sources.join(" / ")}` };
    }
    case "chaos":
      return { value: d.chaos.short, detail: d.chaos.text };
    case "constraint":
      return { value: d.constraint.short, detail: d.constraint.text };
  }
}

export function IdeaResult({ idea, mode, revealKey, onOpenInLab, className, eyebrow }: IdeaResultProps) {
  const router = useRouter();
  const overlay = useOverlay();
  const locks = useSpin((s) => s.locks);
  const toggleLock = useSpin((s) => s.toggleLock);
  const reroll = useSpin((s) => s.reroll);
  const toggleSave = useSpin((s) => s.toggleSave);
  const audio = useSpin((s) => s.audio);
  const isSaved = useSpin((s) => s.history.some((h) => h.id === idea.id && h.saved));

  const lab = mode === "lab";
  const c = idea.concept;

  const handleToggleLock = (key: DnaKey) => {
    const willLock = !locks.includes(key);
    if (audio) {
      playLockClick(willLock);
    }
    toggleLock(key);
  };

  const save = () => {
    toggleSave(idea.id);
    toast(isSaved ? "ĐÃ BỎ LƯU" : "ĐÃ LƯU Ý TƯỞNG", { detail: c.name });
  };

  return (
    <article className={cn("flex w-full flex-col", className)} aria-label={c.name}>
      {/* Eyebrow */}
      <div className="label flex flex-wrap items-center gap-x-5 gap-y-2 text-muted">
        <span className="text-fg font-bold">{eyebrow ?? `Ý TƯỞNG // #${idea.number}`}</span>
        <span>SEED: {idea.recipe.seed}</span>
        <span>CHAOS: {idea.recipe.chaos}%</span>
        {idea.recipe.mutations.map((m, i) => (
          <span key={i} className="border border-line px-1.5 py-0.5 text-[10px] uppercase">
            +{m}
          </span>
        ))}
        {idea.autoMutated && (
          <span className="border border-line bg-fg/10 px-1.5 py-0.5 text-[10px] text-fg">
            AUTO-MUTATION // TRÁNH Ý TƯỞNG SÁO MÒN
          </span>
        )}
        {idea.fusion && (
          <span className="border border-line px-1.5 py-0.5 text-[10px] text-muted">
            FUSION // {idea.fusion.parents[0]} × {idea.fusion.parents[1]}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
        {/* Concept */}
        <div className="flex flex-col gap-8 lg:order-2 lg:col-span-8">
          <div className="flex flex-col gap-5">
            <h1 className="display break-words text-[clamp(2.6rem,7vw,7rem)] tracking-tight">
              <ScrambleText text={c.name} trigger={revealKey} duration={420} />
            </h1>
            <p key={`${idea.id}-pitch`} className="enter max-w-[38ch] text-[clamp(1.2rem,2.1vw,1.75rem)] leading-snug font-normal text-fg">
              “{c.pitch}”
            </p>
          </div>

          <div className="grid grid-cols-1 border-t border-line md:grid-cols-2">
            <Section title="ĐIỂM NHẤN ĐỘT PHÁ (HOOK)" className="md:col-span-2">
              <p className="text-base font-medium leading-relaxed text-fg">{c.hook}</p>
            </Section>
            <Section title="VÌ SAO ĐÁNG ĐẦU TƯ" className="md:col-span-2">
              <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{c.why}</p>
            </Section>
            <Section title="CHU TRÌNH CỐT LÕI (CORE LOOP)">
              <ol className="flex flex-col gap-2.5">
                {c.coreLoop.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="label pt-0.5 text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
            <Section title="TÍNH NĂNG MVP" className="md:border-l md:border-line md:pl-6">
              <ul className="flex flex-col gap-2.5">
                {c.mvp.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-fg" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="TECH STACK">
              <dl className="flex flex-col">
                {c.stack.map((s, i) => (
                  <div key={i} className="flex justify-between gap-4 border-b border-line py-1.5 last:border-0">
                    <dt className="label text-muted">{s.layer}</dt>
                    <dd className="text-right text-sm font-mono">{s.name}</dd>
                  </div>
                ))}
              </dl>
            </Section>
            <Section title="ĐỘ KHÓ & THỜI GIAN THI CÔNG" className="md:border-l md:border-line md:pl-6">
              <div className="flex flex-col gap-3">
                <Scale options={DIFFICULTIES.map((d) => DIFFICULTY_VI[d])} active={DIFFICULTIES.indexOf(c.difficulty)} />
                <Scale options={ESTIMATES.map((e) => ESTIMATE_VI[e])} active={ESTIMATES.indexOf(c.estimate)} />
              </div>
            </Section>
            <Section title="TIỀM NĂNG LAN TRUYỀN (VIRAL SCORE)" className="md:col-span-2">
              <ViralMeter score={c.viral.score} label={c.viral.label} reasons={c.viral.reasons} revealKey={revealKey} />
            </Section>
          </div>
        </div>

        {/* DNA */}
        <aside className="lg:order-1 lg:col-span-4" aria-label="Cấu trúc gen DNA">
          <div className="label mb-3 flex items-center justify-between text-muted">
            <span className="font-bold tracking-wider">CẤU TRÚC GEN (DNA)</span>
            {lab && <span>{locks.length}/6 ĐÃ GHIM</span>}
          </div>
          <ul className="border-t border-line">
            {DNA_KEYS.map((key, i) => {
              const locked = lab && locks.includes(key);
              const { value, detail } = geneValue(idea, key);
              return (
                <li
                  key={key}
                  className={cn(
                    "relative flex items-start gap-3 border-b border-line py-3 pl-3 transition-[padding] duration-150",
                    locked && "pl-4 bg-surface/40",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("absolute inset-y-0 left-0 bg-fg transition-[width] duration-150", locked ? "w-[2px]" : "w-0")}
                  />
                  <span className="label w-5 shrink-0 pt-0.5 text-subtle font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="label text-[10px] text-muted tracking-wider">{GENE_LABEL[key]}</span>
                    <span className="truncate text-base font-semibold uppercase leading-tight tracking-[-0.01em]">
                      {locked ? value : <ScrambleText text={value} trigger={revealKey} duration={300} delay={i * 40} />}
                    </span>
                    <span className="line-clamp-2 text-xs leading-5 text-muted">{detail}</span>
                  </div>
                  {lab && (
                    <button
                      type="button"
                      onClick={() => handleToggleLock(key)}
                      aria-pressed={locked}
                      aria-label={`${locked ? "Bỏ ghim" : "Ghim"} ${GENE_LABEL[key]}`}
                      title={`${locked ? "Bỏ ghim" : "Ghim"} (Phím ${i + 1})`}
                      className={cn(
                        "group relative flex h-10 w-10 shrink-0 items-center justify-center border transition-colors",
                        locked ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-fg hover:text-fg",
                      )}
                    >
                      <LockIcon locked={locked} size={15} />
                      <span className="absolute bottom-0.5 right-1 font-mono text-[9px] opacity-60">
                        {i + 1}
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-10 flex flex-wrap items-center gap-2 border-t border-line bg-bg/95 backdrop-blur-xs px-4 py-3 md:-mx-8 md:px-8">
        {!lab && onOpenInLab && (
          <Button variant="solid" onClick={onOpenInLab}>
            Mở trong Lab <ArrowRightIcon className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant={lab ? "solid" : "outline"} kbd={lab ? "B" : undefined} onClick={() => overlay.show("brief")}>
          Bản đặc tả & Prompt
        </Button>
        {lab && (
          <>
            <Button kbd="R" onClick={() => reroll()}>
              Quay lại (Reroll)
            </Button>
            <Button kbd="M" onClick={() => overlay.show("mutate")}>
              Biến dị (Mutate)
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => router.push("/fuse")}>
          Lai tạo (Fuse)
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" kbd={lab ? "S" : undefined} pressed={isSaved} onClick={save}>
            {isSaved ? "Đã lưu" : "Lưu"}
          </Button>
          <Button variant="ghost" kbd={lab ? "⇧S" : undefined} onClick={() => overlay.show("share")}>
            Chia sẻ / Poster
          </Button>
        </div>
      </div>

      <BuildBriefDialog idea={idea} open={overlay.open === "brief"} onClose={() => overlay.hide("brief")} />
      <ShareDialog idea={idea} open={overlay.open === "share"} onClose={() => overlay.hide("share")} eyebrow={eyebrow} />
      {lab && <MutateMenu open={overlay.open === "mutate"} onClose={() => overlay.hide("mutate")} />}
    </article>
  );
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3 border-b border-line py-5", className)}>
      <h2 className="label text-muted tracking-wider">{title}</h2>
      {children}
    </section>
  );
}

function Scale({ options, active }: { options: string[]; active: number }) {
  return (
    <div className="flex border border-line" role="group">
      {options.map((opt, i) => (
        <span
          key={opt}
          className={cn(
            "label flex h-7 flex-1 items-center justify-center border-r border-line last:border-0",
            i === active ? "bg-fg text-bg font-bold" : "text-muted",
          )}
        >
          {opt}
        </span>
      ))}
    </div>
  );
}

function ViralMeter({ score, label, reasons, revealKey }: { score: number; label: string; reasons: string[]; revealKey?: string | number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="tabular font-mono text-3xl font-bold tracking-tight">
          <ScrambleText text={`${score}/100`} trigger={revealKey} duration={300} />
        </span>
        <span className="label font-bold text-fg tracking-wider">{label}</span>
      </div>
      <div className="h-2 w-full border border-line p-[1px]">
        <div className="h-full bg-fg transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-xs text-muted">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span>•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
