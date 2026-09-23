"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Idea } from "@/types";
import { dnaLine } from "@/lib/ui/format";

export function IdeaCard({
  idea,
  meta,
  actions,
  className = "",
  compact = false,
}: {
  idea: Idea;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-3 border border-line bg-surface hover:border-line-strong transition-colors gap-4 ${className}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="font-mono text-xs text-muted">
            #{idea.code.toUpperCase()}
          </span>
          <Link
            href={`/idea/${idea.code}`}
            className="font-bold text-sm text-fg uppercase truncate hover:underline"
          >
            {idea.concept.name}
          </Link>
          <span className="hidden sm:inline font-mono text-[10px] text-muted truncate">
            {dnaLine(idea)}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {meta}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 p-4 border border-line bg-surface hover:border-line-strong transition-colors ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-muted">
            IDEA #{idea.code.toUpperCase()}
          </span>
          {idea.autoMutated && (
            <span className="px-1.5 py-0.2 bg-line text-[9px] font-mono uppercase text-fg">
              MUTATED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
          <span>CHAOS {idea.recipe.chaos}%</span>
          {meta}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Link
          href={`/idea/${idea.code}`}
          className="text-lg font-bold text-fg uppercase hover:underline tracking-tight"
        >
          {idea.concept.name}
        </Link>
        <p className="text-xs text-muted line-clamp-2 italic">
          &ldquo;{idea.concept.pitch}&rdquo;
        </p>
      </div>

      <div className="font-mono text-[10px] text-muted truncate border-t border-line/50 pt-2">
        {dnaLine(idea)}
      </div>

      {actions && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {actions}
        </div>
      )}
    </div>
  );
}
