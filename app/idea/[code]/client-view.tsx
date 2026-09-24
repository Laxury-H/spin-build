"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Idea } from "@/types";
import { useSpin } from "@/lib/store";
import { IdeaResult } from "@/components/idea/IdeaResult";

export function IdeaClientView({ idea }: { idea: Idea }) {
  const router = useRouter();
  const loadIdea = useSpin((s) => s.loadIdea);

  const openInLab = () => {
    loadIdea(idea);
    router.push("/");
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <div className="label flex items-center justify-between gap-4 border-b border-line pb-4 text-muted">
        <span>Ý tưởng được chia sẻ</span>
        <Link href="/" className="hover:text-fg">
          Tự quay một cái →
        </Link>
      </div>
      <IdeaResult idea={idea} mode="view" eyebrow={`Chia sẻ // #${idea.number}`} onOpenInLab={openInLab} />
    </main>
  );
}
