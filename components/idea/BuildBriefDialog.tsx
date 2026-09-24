"use client";

import { useState } from "react";
import type { Idea } from "@/types";
import { buildBrief, briefToPrompt, ideaToText } from "@/lib/generator/brief";
import { copyText } from "@/lib/ui/clipboard";
import { toast } from "@/lib/ui/toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function BuildBriefDialog({
  idea,
  open,
  onClose,
}: {
  idea: Idea | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedIdea, setCopiedIdea] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!idea) return null;

  const brief = buildBrief(idea);
  const prompt = briefToPrompt(idea, brief);

  const handleCopyPrompt = async () => {
    const ok = await copyText(prompt);
    if (ok) {
      setCopiedPrompt(true);
      toast("ĐÃ SAO CHÉP PROMPT CHO AI", {
        detail: "Dán vào Cursor, Claude, ChatGPT hoặc v0 để bắt đầu lập trình ngay",
      });
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const handleCopyIdea = async () => {
    const ok = await copyText(ideaToText(idea));
    if (ok) {
      setCopiedIdea(true);
      toast("ĐÃ SAO CHÉP TÓM TẮT Ý TƯỞNG", {
        detail: "Đã lưu vào bộ nhớ tạm của bạn",
      });
      setTimeout(() => setCopiedIdea(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`BẢN ĐẶC TẢ TRIỂN KHAI // ${idea.concept.name}`}
      size="full"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyIdea}
          >
            {copiedIdea ? "ĐÃ SAO CHÉP ✓" : "SAO CHÉP TÓM TẮT"}
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={handleCopyPrompt}
            className="font-bold"
          >
            {copiedPrompt ? "ĐÃ SAO CHÉP PROMPT ✓" : "SAO CHÉP PROMPT CHO AI"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8 max-w-4xl mx-auto py-2">
        {/* Progress Rail */}
        <div className="flex items-center gap-2 text-[11px] font-mono border-b border-line pb-4 text-muted overflow-x-auto no-scrollbar">
          <span className="text-fg font-bold">SPIN ✓</span>
          <span>→</span>
          <span className="text-fg font-bold">DISCOVER ✓</span>
          <span>→</span>
          <span className={idea.recipe.mutations?.length ? "text-fg font-bold" : "text-muted"}>
            MUTATE {idea.recipe.mutations?.length ? "✓" : "○"}
          </span>
          <span>→</span>
          <span className="text-fg font-bold">MVP SPEC ✓</span>
          <span>→</span>
          <span className={copiedPrompt ? "text-fg font-bold" : "text-muted"}>
            PROMPT {copiedPrompt ? "✓" : "○"}
          </span>
          <span>→</span>
          <span className="text-muted">BUILD ○</span>
        </div>

        {/* Product Hero */}
        <div className="flex flex-col gap-2">
          <span className="label text-muted">PRODUCT CONCEPT</span>
          <h2 className="text-3xl font-bold tracking-tight text-fg">
            {idea.concept.name}
          </h2>
          <p className="text-lg text-muted italic">
            &ldquo;{idea.concept.pitch}&rdquo;
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-line py-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="label text-muted block mb-2">TARGET AUDIENCE & PROBLEM</span>
              <p className="text-sm font-semibold text-fg mb-1">
                {idea.dna.target.label} ({idea.dna.target.context})
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {brief.userProblem}
              </p>
            </div>

            <div>
              <span className="label text-muted block mb-2">CORE INTERACTION LOOP</span>
              <ol className="flex flex-col gap-2 text-xs">
                {brief.coreLoop.map((step, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="font-mono text-muted">0{idx + 1}</span>
                    <span className="text-fg leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <span className="label text-muted block mb-2">MVP FEATURES</span>
              <ul className="flex flex-col gap-1.5 text-xs text-fg">
                {brief.mvpFeatures.map((feat, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <span className="text-muted">▪</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="label text-muted block mb-2">SUGGESTED TECH STACK</span>
              <div className="flex flex-col divide-y divide-line/40 border border-line text-xs font-mono">
                {brief.techStack.map((s, idx) => (
                  <div key={idx} className="flex justify-between px-3 py-2 bg-surface">
                    <span className="text-muted">{s.layer}</span>
                    <span className="text-fg font-semibold">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="label text-muted block mb-2">REQUIRED APIS & PROTOCOLS</span>
              <div className="flex flex-wrap gap-1.5">
                {brief.requiredApis.map((api, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 border border-line bg-surface text-xs font-mono text-fg"
                  >
                    {api}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="label text-muted block mb-2">RULES & CONSTRAINTS</span>
              <div className="flex flex-col gap-2 text-xs">
                <div className="p-2.5 bg-surface border border-line">
                  <span className="font-mono text-muted block mb-0.5">RULE: {idea.dna.chaos.short}</span>
                  <span className="text-fg">{idea.dna.chaos.text}</span>
                </div>
                <div className="p-2.5 bg-surface border border-line">
                  <span className="font-mono text-muted block mb-0.5">CONSTRAINT: {idea.dna.constraint.short}</span>
                  <span className="text-fg">{idea.dna.constraint.text}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Roadmap */}
        <div>
          <span className="label text-muted block mb-3">IMPLEMENTATION ROADMAP</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {brief.implementationSteps.map((step, idx) => (
              <div key={idx} className="p-3 border border-line bg-surface flex gap-3 items-start">
                <span className="font-mono text-muted font-bold">0{idx + 1}</span>
                <span className="text-fg leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Prompt Preview */}
        <div className="border border-line bg-surface p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="label text-muted">CODING AGENT SYSTEM PROMPT</span>
            <button
              type="button"
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="text-xs font-mono text-muted hover:text-fg underline cursor-pointer"
            >
              {showPromptPreview ? "HIDE PREVIEW" : "VIEW FULL PROMPT"}
            </button>
          </div>

          {showPromptPreview && (
            <pre className="p-3 bg-bg border border-line font-mono text-xs text-muted whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
              {prompt}
            </pre>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="solid" onClick={handleCopyPrompt}>
              {copiedPrompt ? "PROMPT COPIED ✓" : "COPY BUILD PROMPT"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
