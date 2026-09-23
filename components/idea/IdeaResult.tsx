"use client";

import { useState } from "react";
import type { DnaKey, Idea, Difficulty, Estimate } from "@/types";
import { DNA_KEYS } from "@/types";
import { useSpin } from "@/lib/store";
import { useOverlay } from "@/lib/ui/dialogs";
import { toast } from "@/lib/ui/toast";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import {
  LockIcon,
  BoltIcon,
  RefreshIcon,
  MutateIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
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

const DNA_METADATA: Record<
  DnaKey,
  {
    icon: string;
    vi: string;
    en: string;
    desc: (idea: Idea) => string;
    color: string;
    borderActive: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  domain: {
    icon: "🏷️",
    vi: "Lĩnh vực",
    en: "DOMAIN",
    desc: (idea) => idea.dna.domain.label,
    color: "text-indigo-400",
    borderActive: "border-indigo-500/70 bg-indigo-500/10 ring-1 ring-indigo-500/40",
    badgeBg: "bg-indigo-500/15 border-indigo-500/30",
    badgeText: "text-indigo-300",
  },
  target: {
    icon: "🎯",
    vi: "Khách hàng mục tiêu",
    en: "TARGET",
    desc: (idea) => `${idea.dna.target.label} (${idea.dna.target.context})`,
    color: "text-rose-400",
    borderActive: "border-rose-500/70 bg-rose-500/10 ring-1 ring-rose-500/40",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    badgeText: "text-rose-300",
  },
  mechanic: {
    icon: "⚙️",
    vi: "Cơ chế hoạt động",
    en: "MECHANIC",
    desc: (idea) => idea.dna.mechanic.verb,
    color: "text-emerald-400",
    borderActive: "border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/40",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    badgeText: "text-emerald-300",
  },
  trend: {
    icon: "📈",
    vi: "Xu hướng áp dụng",
    en: "TREND",
    desc: (idea) => idea.dna.trend.angle || idea.dna.trend.category,
    color: "text-amber-400",
    borderActive: "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/40",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-300",
  },
  chaos: {
    icon: "⚡",
    vi: "Điểm dị biệt (Chaos)",
    en: "CHAOS RULE",
    desc: (idea) => idea.dna.chaos.text,
    color: "text-purple-400",
    borderActive: "border-purple-500/70 bg-purple-500/10 ring-1 ring-purple-500/40",
    badgeBg: "bg-purple-500/15 border-purple-500/30",
    badgeText: "text-purple-300",
  },
  constraint: {
    icon: "🔒",
    vi: "Ràng buộc kỹ thuật",
    en: "CONSTRAINT",
    desc: (idea) => idea.dna.constraint.text,
    color: "text-sky-400",
    borderActive: "border-sky-500/70 bg-sky-500/10 ring-1 ring-sky-500/40",
    badgeBg: "bg-sky-500/15 border-sky-500/30",
    badgeText: "text-sky-300",
  },
};

export function IdeaResult({
  idea,
  mode,
  revealKey,
  onOpenInLab,
  className = "",
  eyebrow,
}: IdeaResultProps) {
  const overlay = useOverlay();
  const locks = useSpin((s) => s.locks);
  const toggleLock = useSpin((s) => s.toggleLock);
  const reroll = useSpin((s) => s.reroll);
  const spin = useSpin((s) => s.spin);
  const toggleSave = useSpin((s) => s.toggleSave);
  const history = useSpin((s) => s.history);

  const isSaved = history.some((h) => h.id === idea.id && h.saved);
  const [briefOpen, setBriefOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mutateOpen, setMutateOpen] = useState(false);

  const isLocked = (key: DnaKey) => locks.includes(key);

  const handleSave = () => {
    toggleSave(idea.id);
    toast(isSaved ? "ĐÃ XÓA KHỎI DANH SÁCH LƯU" : "ĐÃ LƯU Ý TƯỞNG THÀNH CÔNG", {
      detail: idea.concept.name,
    });
  };

  const getDnaValue = (key: DnaKey) => {
    switch (key) {
      case "domain":
        return idea.dna.domain.short;
      case "target":
        return idea.dna.target.short;
      case "mechanic":
        return idea.dna.mechanic.short;
      case "trend":
        return idea.dna.trend.title.toUpperCase();
      case "chaos":
        return idea.dna.chaos.short;
      case "constraint":
        return idea.dna.constraint.short;
    }
  };

  const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD", "UNHINGED"];
  const estimates: Estimate[] = ["3 HOURS", "1 DAY", "WEEKEND", "1 WEEK"];

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 w-full ${className}`}>
      {/* 1. Product Overview Card */}
      <div className="flex flex-col gap-5 p-6 sm:p-8 rounded-2xl border border-line bg-surface/90 shadow-xl backdrop-blur-md">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 text-xs font-mono text-muted">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-md bg-fg text-bg font-extrabold text-xs">
              {eyebrow || `Ý TƯỞNG #${idea.recipe.seed}`}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-line text-muted">
              {idea.dna.domain.label}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-line text-muted">
              MỨC DỊ: {idea.recipe.chaos}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {idea.autoMutated && (
              <span className="px-2.5 py-1 rounded-md border border-line-strong bg-surface-2 text-xs text-fg">
                ✨ ĐÃ TỰ ĐỘNG LÀM MỚI
              </span>
            )}
            {idea.recipe.mutations?.map((m: string, idx: number) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md border border-line bg-surface text-xs text-muted uppercase font-mono"
              >
                +{m}
              </span>
            ))}
          </div>
        </div>

        {/* Product Name & Pitch */}
        <div className="flex flex-col gap-3 py-1">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-fg tracking-tight uppercase leading-tight">
            <ScrambleText text={idea.concept.name} trigger={revealKey} />
          </h1>

          <p className="text-base sm:text-xl text-muted font-normal leading-relaxed">
            &ldquo;{idea.concept.pitch}&rdquo;
          </p>
        </div>

        {/* Distinctive Hook Highlight */}
        <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <span className="text-2xl mt-0.5">💡</span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              ĐIỂM ĐỘC ĐÁO TẠO NÊN SỰ KHÁC BIỆT
            </span>
            <p className="text-sm sm:text-base font-semibold text-fg leading-relaxed">
              {idea.concept.hook}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Six Core Genetic Blocks (6 Mảnh ghép) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-fg uppercase tracking-tight">
              6 MẢNH GHÉP Ý TƯỞNG
            </h2>
            <span className="text-xs font-mono text-muted">
              ({locks.length}/6 đã ghim)
            </span>
          </div>

          {mode === "lab" && (
            <span className="text-xs font-mono text-muted">
              Bấm <strong className="text-fg">GHIM</strong> các mảnh bạn thích để giữ lại khi quay mới
            </span>
          )}
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DNA_KEYS.map((key) => {
            const meta = DNA_METADATA[key];
            const locked = isLocked(key);
            const val = getDnaValue(key);
            const sub = meta.desc(idea);

            return (
              <div
                key={key}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  locked
                    ? meta.borderActive
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-base">{meta.icon}</span>
                    <span className={`font-bold ${meta.color}`}>{meta.vi}</span>
                  </div>

                  {mode === "lab" && (
                    <button
                      type="button"
                      onClick={() => toggleLock(key)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                        locked
                          ? "bg-fg text-bg font-extrabold shadow-xs"
                          : "border border-line text-muted hover:text-fg hover:border-line-strong hover:bg-surface-2"
                      }`}
                      title={locked ? "Bỏ ghim" : "Ghim mảnh ghép này"}
                    >
                      <LockIcon locked={locked} className="w-3 h-3" />
                      <span>{locked ? "ĐÃ GHIM" : "GHIM"}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-sans font-black text-lg text-fg tracking-tight truncate">
                    {locked ? val : <ScrambleText text={val} trigger={revealKey} />}
                  </span>
                  <span className="text-xs text-muted leading-relaxed line-clamp-2">
                    {sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Product Specifications & Execution Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border border-line bg-surface">
        {/* Left Specification Column */}
        <div className="flex flex-col gap-6">
          {/* Core Loop */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
              🔄 CÁCH THỨC HOẠT ĐỘNG (CORE LOOP)
            </span>
            <div className="flex flex-col gap-2 text-xs">
              {idea.concept.coreLoop.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-bg/60 border border-line/60"
                >
                  <span className="w-5 h-5 rounded-full bg-surface-2 border border-line flex items-center justify-center font-mono font-bold text-[10px] text-fg shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-fg leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MVP Scope */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
              🛠️ TÍNH NĂNG MVP CẦN LÀM
            </span>
            <ul className="flex flex-col gap-1.5 text-xs text-fg">
              {idea.concept.mvp.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-fg font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Specification Column */}
        <div className="flex flex-col gap-6">
          {/* Tech Stack */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
              💻 CÔNG NGHỆ GỢI Ý (TECH STACK)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {idea.concept.stack.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-bg/60 border border-line/60 flex flex-col gap-0.5"
                >
                  <span className="text-[10px] text-muted">{item.layer}</span>
                  <span className="text-fg font-bold truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estimates, Difficulty & Viral Meter */}
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-line bg-bg/60 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted uppercase">
                  ĐỘ KHÓ
                </span>
                <span className="font-bold text-fg">
                  {idea.concept.difficulty}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-line bg-bg/60 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted uppercase">
                  THỜI GIAN DỰ KIẾN
                </span>
                <span className="font-bold text-fg">
                  {idea.concept.estimate}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-line bg-bg/60 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-muted uppercase">
                  TIỀM NĂNG VIRAL
                </span>
                <span className="font-bold text-fg">
                  {idea.concept.viral.label} ({idea.concept.viral.score}/100)
                </span>
              </div>
              <div className="w-full bg-line h-2 rounded-full overflow-hidden">
                <div
                  className="bg-fg h-full rounded-full transition-all duration-500"
                  style={{ width: `${idea.concept.viral.score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Action Floating Toolbar */}
      <div className="sticky bottom-6 z-30 p-3 sm:p-4 rounded-2xl bg-bg/95 backdrop-blur-xl border border-line-strong flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        {mode === "view" ? (
          <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
            {onOpenInLab && (
              <Button
                variant="solid"
                onClick={onOpenInLab}
                icon={<ArrowRightIcon className="w-4 h-4" />}
              >
                MỞ TRONG VÒNG QUAY (LAB)
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                icon={<BookmarkIcon filled={isSaved} className="w-4 h-4" />}
              >
                {isSaved ? "ĐÃ LƯU ✓" : "LƯU Ý TƯỞNG"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShareOpen(true)}
                icon={<ShareIcon className="w-4 h-4" />}
              >
                XUẤT POSTER / CHIA SẺ
              </Button>
              <Button
                variant="solid"
                onClick={() => setBriefOpen(true)}
                icon={<BoltIcon className="w-4 h-4" />}
              >
                LẤY PROMPT CHO AI CODE
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Primary Action Group */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="solid"
                onClick={() => setBriefOpen(true)}
                kbd="B"
                icon={<BoltIcon className="w-4 h-4" />}
                className="font-bold shadow-md"
              >
                LẤY PROMPT CHO AI CODE
              </Button>

              <Button
                variant="outline"
                onClick={() => reroll()}
                kbd="R"
                icon={<RefreshIcon className="w-4 h-4" />}
              >
                QUAY LẠI PHẦN CHƯA GHIM
              </Button>

              <Button
                variant="outline"
                onClick={() => setMutateOpen(true)}
                kbd="M"
                icon={<MutateIcon className="w-4 h-4" />}
              >
                BIẾN DỊ Ý TƯỞNG
              </Button>
            </div>

            {/* Secondary Action Group */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleSave}
                kbd="S"
                icon={<BookmarkIcon filled={isSaved} className="w-4 h-4" />}
              >
                {isSaved ? "ĐÃ LƯU" : "LƯU"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShareOpen(true)}
                kbd="⇧S"
                icon={<ShareIcon className="w-4 h-4" />}
              >
                XUẤT POSTER
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Popups & Dialogs */}
      <BuildBriefDialog
        idea={idea}
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
      />
      <ShareDialog
        idea={idea}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <MutateMenu
        open={mutateOpen}
        onClose={() => setMutateOpen(false)}
      />
    </div>
  );
}
