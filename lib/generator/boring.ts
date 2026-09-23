import type { Concept, IdeaDNA, MutationKind } from "@/types";

/** STUB — replaced by engine-synth. Signatures are contractual. */
export interface BoringReport {
  score: number;
  reasons: string[];
  generic: boolean;
}

export const BORING_THRESHOLD = 55;

export function scoreBoringness(_dna: IdeaDNA, _concept: Concept): BoringReport {
  return { score: 0, reasons: [], generic: false };
}

export function antiBoringMutation(_dna: IdeaDNA, _report: BoringReport): MutationKind {
  return "weird";
}
