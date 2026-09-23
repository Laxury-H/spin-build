"use client";

import { useSpin } from "@/lib/store";
import { useOverlay } from "@/lib/ui/dialogs";
import { toast } from "@/lib/ui/toast";
import { MUTATIONS, type MutationKind } from "@/types";
import { Kbd } from "@/components/ui/Kbd";

const MUTATION_DESCRIPTIONS: Record<MutationKind, string> = {
  useful: "Swaps genes for higher practicality and direct utility",
  viral: "Amplifies shareability, screenshot bait and visceral hooks",
  weird: "Injects unconventional unhinged rules and strange mechanics",
  technical: "Deepens developer tooling, APIs, and systems engineering",
  social: "Introduces multiplayer, peer pressure, and communal loops",
  simpler: "Strips complex dependencies down to a clean MVP",
  harder: "Increases engineering ambition and technical complexity",
  cheaper: "Eliminates backend costs and cloud subscription overhead",
  chaotic: "Spikes the chaos slider and mutates the core premise",
};

export function MutateMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mutate = useSpin((s) => s.mutate);
  const current = useSpin((s) => s.current);

  if (!open || !current) return null;

  const handleSelect = (kind: MutationKind, label: string) => {
    mutate(kind);
    onClose();
    toast(`MUTATION // ${label}`, { detail: "GENETIC DRIFT APPLIED" });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed z-50 bottom-16 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full max-w-md bg-bg border border-line-strong p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <span className="label text-fg font-bold tracking-widest">
            MUTATE IDEA // SELECT VECTOR
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg font-mono text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col divide-y divide-line/40 max-h-[380px] overflow-y-auto">
          {MUTATIONS.map((m, i) => (
            <button
              key={m.kind}
              type="button"
              onClick={() => handleSelect(m.kind, m.label)}
              className="flex items-center justify-between p-2.5 hover:bg-surface text-left transition-colors cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-fg group-hover:underline">
                  {m.label}
                </span>
                <span className="text-[11px] text-muted">
                  {MUTATION_DESCRIPTIONS[m.kind]}
                </span>
              </div>
              <Kbd>{i + 1}</Kbd>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
