import type { ReactNode } from "react";
import Link from "next/link";
import type { Idea } from "@/types";
import { dnaLine } from "@/lib/ui/format";
import { cn } from "@/lib/ui/cn";

/** Hairline row/card for lists (saved, history, fuse parents). */
export function IdeaCard({
  idea,
  meta,
  actions,
  className,
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
      <div className={cn("flex items-center justify-between gap-4 border-b border-line py-3", className)}>
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="label shrink-0 text-muted">#{idea.number}</span>
          <Link href={`/idea/${idea.code}`} className="truncate font-medium uppercase hover:underline">
            {idea.concept.name}
          </Link>
          <span className="label hidden truncate text-subtle md:inline">{dnaLine(idea)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <article className={cn("grid grid-cols-1 gap-4 border border-line p-5 md:grid-cols-12 md:gap-6", className)}>
      <div className="label flex gap-4 text-muted md:col-span-2 md:flex-col md:gap-1">
        <span className="text-fg">#{idea.number}</span>
        <span>Độ dị {idea.recipe.chaos}%</span>
        {meta}
      </div>
      <div className="flex min-w-0 flex-col gap-2 md:col-span-6">
        <Link
          href={`/idea/${idea.code}`}
          className="text-2xl font-semibold uppercase leading-tight tracking-[-0.02em] hover:underline"
        >
          {idea.concept.name}
        </Link>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">“{idea.concept.pitch}”</p>
        <p className="label truncate text-subtle">{dnaLine(idea)}</p>
      </div>
      {actions && <div className="flex items-start md:col-span-4 md:justify-end">{actions}</div>}
    </article>
  );
}
