"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { DnaKey, Idea } from "@/types";
import { DNA_KEYS, TREND_SOURCE_LABEL } from "@/types";
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
import { NeuralGraphView } from "./NeuralGraph";
import { useTranslation } from "@/lib/ui/useTranslation";

export interface IdeaResultProps {
  idea: Idea;
  mode: "lab" | "view";
  revealKey?: string | number;
  onOpenInLab?: () => void;
  className?: string;
  eyebrow?: string;
}

function geneValue(idea: Idea, key: DnaKey): { value: string; detail: string } {
  const d = idea.dna;
  switch (key) {
    case "domain":
      return { value: d.domain.short, detail: SECTOR_BY_ID[d.domain.sector]?.label ?? d.domain.sector };
    case "target":
      return { value: d.target.short, detail: d.target.context };
    case "mechanic":
      return { value: d.mechanic.short, detail: d.mechanic.verb };
    case "trend": {
      const sources = (d.trend.sources?.length ? d.trend.sources : [d.trend.source]).map((s) => TREND_SOURCE_LABEL[s]);
      return { value: d.trend.title.toUpperCase(), detail: sources.join(" / ") };
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
  const { t } = useTranslation();

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
    toast(isSaved ? "REMOVED" : "SAVED", { detail: c.name });
  };

  return (
    <article className={cn("flex w-full flex-col", className)} aria-label={c.name}>
      {/* Metadata / Eyebrow */}
      <div className="label flex flex-wrap items-center gap-x-5 gap-y-2 text-muted font-mono text-[10px]">
        <span className="text-fg font-bold tracking-wider">{eyebrow ?? `${t("idea_generated")} // #${idea.number}`}</span>
        <span>SEED {idea.recipe.seed}</span>
        <span>CHAOS {idea.recipe.chaos}%</span>
        {idea.recipe.mutations.map((m, i) => (
          <span key={i} className="border border-line px-1.5 py-0.5 uppercase">
            +{m}
          </span>
        ))}
        {idea.autoMutated && (
          <span className="border border-line bg-fg/10 px-1.5 py-0.5 text-fg">
            {t("auto_mutation")}
          </span>
        )}
        {idea.fusion && (
          <span className="border border-line px-1.5 py-0.5 text-muted">
            FUSION // {idea.fusion.parents[0]} × {idea.fusion.parents[1]}
          </span>
        )}
      </div>

      <div className="relative mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8 border-t border-line pt-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-fg)_0%,transparent_50%)] opacity-[0.03] blur-3xl" />
        
        {/* Main Concept View */}
        <div className="flex flex-col gap-10 lg:order-2 lg:col-span-8">
          
          <div className="flex flex-col gap-5">
            <h1 className="display break-words text-[clamp(2.6rem,7vw,6.5rem)] tracking-tight leading-[0.9]">
              {c.name}
            </h1>
            <p key={`${idea.id}-pitch`} className="enter max-w-[40ch] text-[clamp(1.2rem,2.1vw,1.6rem)] leading-snug font-normal text-fg">
              “{c.pitch}”
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Section title={t("diff_hook")} className="md:col-span-2">
              <p className="text-base font-medium leading-relaxed text-fg">{c.hook}</p>
            </Section>
            
            <Section title={t("why_build")} className="md:col-span-2">
              <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{c.why}</p>
            </Section>
            
            <Section title={t("core_loop")}>
              <ol className="flex flex-col gap-2.5">
                {c.coreLoop.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="label pt-0.5 text-muted font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
            
            <Section title={t("mvp_features")} >
              <ul className="flex flex-col gap-2.5">
                {c.mvp.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-[7px] h-[3px] w-[3px] shrink-0 bg-fg rounded-full" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
            
            <Section title={t("tech_stack")} className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                {c.stack.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 border border-line py-1 px-2.5 bg-surface/30">
                    <span className="label text-muted text-[10px] font-mono">{s.layer}</span>
                    <span className="text-sm font-mono text-fg">{s.name}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t("eval")} className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="label text-muted font-mono text-[10px] uppercase">{t("diff_time")}</span>
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-sm tracking-wider uppercase">{c.difficulty} / {c.estimate}</span>
                  </div>
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <span className="label text-muted font-mono text-[10px] uppercase">{t("viral_potential")}</span>
                  <ViralMeter score={c.viral.score} label={c.viral.label} reasons={c.viral.reasons} revealKey={revealKey} />
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* DNA Graph & Breakdown */}
        <aside className="lg:order-1 lg:col-span-4 flex flex-col gap-6" aria-label={t("dna_structure")}>
          
          <NeuralGraphView idea={idea} />

          <div className="flex flex-col">
            <div className="label mb-3 flex items-center justify-between text-muted font-mono text-[10px]">
              <span className="tracking-wider uppercase">{t("dna_structure")}</span>
              {lab && <span>{locks.length}/6 {t("locked_count")}</span>}
            </div>
            
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {DNA_KEYS.map((key, i) => {
                const locked = lab && locks.includes(key);
                const { value, detail } = geneValue(idea, key);
                // Dynamically access the dictionary key for genes
                const geneKey = `gene_${key}` as const;
                
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
                      className={cn("absolute top-0 left-0 h-[2px] bg-fg transition-all duration-300", locked ? "w-full" : "w-0")}
                    />
                    
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="label text-[9px] text-muted tracking-widest uppercase">{t(geneKey)}</span>
                      <span className="text-sm break-words font-bold uppercase leading-tight tracking-[-0.01em]">
                        {value}
                      </span>
                      <span className="text-xs leading-5 text-muted">{detail}</span>
                    </div>
                    {lab && (
                      <button
                        type="button"
                        onClick={() => handleToggleLock(key)}
                        aria-pressed={locked}
                        aria-label={`${locked ? "Unlock" : "Lock"} ${t(geneKey)}`}
                        className={cn(
                          "group relative flex h-9 w-9 shrink-0 items-center justify-center border transition-colors",
                          locked ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-fg hover:text-fg",
                        )}
                      >
                        <LockIcon locked={locked} size={13} />
                        <span className="absolute bottom-0.5 right-1 font-mono text-[8px] opacity-60">
                          {i + 1}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-12 flex flex-wrap items-center gap-2 border-t border-line bg-bg/95 backdrop-blur-xs px-4 py-3 md:-mx-8 md:px-8">
        {!lab && onOpenInLab && (
          <Button variant="solid" onClick={onOpenInLab}>
            {t("open_in_lab")} <ArrowRightIcon className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant={lab ? "solid" : "outline"} kbd={lab ? "B" : undefined} onClick={() => overlay.show("brief")}>
          {t("brief_btn")}
        </Button>
        {lab && (
          <>
            <Button kbd="R" onClick={() => reroll()}>
              {t("reroll_btn")}
            </Button>
            <Button kbd="M" onClick={() => overlay.show("mutate")}>
              {t("mutate_btn")}
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => router.push("/fuse")}>
          {t("fuse_btn")}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" kbd={lab ? "S" : undefined} pressed={isSaved} onClick={save}>
            {isSaved ? t("saved_btn") : t("save_btn")}
          </Button>
          <Button variant="ghost" kbd={lab ? "⇧S" : undefined} onClick={() => overlay.show("share")}>
            {t("share_btn")}
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
      <h2 className="label text-muted font-mono text-[10px] tracking-wider uppercase">{title}</h2>
      {children}
    </section>
  );
}

function ViralMeter({ score, label, reasons, revealKey }: { score: number; label: string; reasons: string[]; revealKey?: string | number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="label font-bold text-fg tracking-wider uppercase">{label}</span>
        <span className="tabular font-mono text-xl font-bold tracking-tight">
          {score}/100
        </span>
      </div>
      <div className="h-1.5 w-full border border-line p-[1px]">
        <div className="h-full bg-fg transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-xs text-muted">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-subtle opacity-50">+</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
