import type { Concept, IdeaDNA, MutationKind } from "@/types";

export interface BoringReport {
  score: number;
  reasons: string[];
  generic: boolean;
}

export const BORING_THRESHOLD = 55;

const COMMODITY_WORDS = [
  "todo",
  "task manager",
  "weather",
  "notes app",
  "habit tracker",
  "chat app",
  "simple dashboard",
  "calculator",
  "alarm clock",
  "flashcards",
];

export function scoreBoringness(dna: IdeaDNA, concept: Concept): BoringReport {
  let score = 0;
  const reasons: string[] = [];

  // 1. Commodity domain tags
  if (dna.domain.tags?.includes("commodity")) {
    score += 35;
    reasons.push("Commodity domain (generic problem space)");
  }

  // 2. Commodity mechanic tags
  if (dna.mechanic.tags?.includes("commodity")) {
    score += 20;
    reasons.push("Commodity mechanic");
  }

  // 3. Low chaos level
  if (dna.chaos.weirdness < 25) {
    score += 15;
    reasons.push("Low chaos / conventional mechanics");
  }

  // 4. Common generic buzzwords in pitch / name
  const text = `${concept.name} ${concept.pitch}`.toLowerCase();
  for (const word of COMMODITY_WORDS) {
    if (text.includes(word)) {
      score += 25;
      reasons.push(`Contains generic concept pattern: "${word}"`);
      break;
    }
  }

  return {
    score,
    reasons,
    generic: score >= BORING_THRESHOLD,
  };
}

export function antiBoringMutation(dna: IdeaDNA, report: BoringReport): MutationKind {
  if (report.reasons.some((r) => r.includes("generic concept pattern"))) {
    return "chaotic";
  }
  if (dna.chaos.weirdness < 30) {
    return "weird";
  }
  return "social";
}
