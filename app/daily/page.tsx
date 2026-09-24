"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dailyIdea } from "@/lib/generator";
import { dailyPlan } from "@/lib/generator/daily";
import { useSpin } from "@/lib/store";
import { IdeaResult } from "@/components/idea/IdeaResult";

function untilNextUtcMidnight(now: number): string {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export default function DailyPage() {
  const router = useRouter();
  const loadIdea = useSpin((s) => s.loadIdea);

  const plan = useMemo(() => dailyPlan(), []);
  const idea = useMemo(() => dailyIdea(), []);
  const number = String(plan.number).padStart(4, "0");

  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setCountdown(untilNextUtcMidnight(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const openInLab = () => {
    loadIdea(idea);
    router.push("/");
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
      <header className="grid grid-cols-1 gap-8 border-b border-line pb-8 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <span className="label text-muted tracking-wider">DAILY SYNCHRONIZED SEED //</span>
          <span className="tabular font-mono text-[clamp(4rem,14vw,11rem)] leading-[0.85] tracking-[-0.06em] font-bold">
            {number}
          </span>
        </div>
        <div className="flex flex-col justify-end gap-6 lg:col-span-5">
          <p className="display text-[clamp(2rem,4vw,3.6rem)] tracking-tight">
            MỘT THẾ GIỚI.
            <br />
            MỘT HẠT GIỐNG.
            <br />
            24 GIỜ DUY NHẤT.
          </p>
          <dl className="label flex flex-wrap gap-x-6 gap-y-1 text-muted text-xs">
            <div className="flex gap-2">
              <dt>NGÀY UTC:</dt>
              <dd className="text-fg font-mono">{plan.dateKey}</dd>
            </div>
            <div className="flex gap-2">
              <dt>SEED MỚI SAU:</dt>
              <dd className="tabular text-fg font-mono font-bold">{countdown ?? "--:--:--"}</dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-muted">
            Mọi kỹ sư và nhà sáng lập truy cập trong ngày hôm nay trên toàn cầu đều nhận được một hạt giống ý tưởng tất định giống hệt nhau.
          </p>
        </div>
      </header>

      <IdeaResult idea={idea} mode="view" eyebrow={`DAILY SEED // #${number}`} onOpenInLab={openInLab} />
    </main>
  );
}
