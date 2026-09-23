import type { Idea, IdeaRecipe } from "@/types";
import type { Rng } from "@/lib/random";

/** STUB — replaced by engine-synth. Signature is contractual. */
export function planFusion(a: Idea, b: Idea, _rng: Rng): IdeaRecipe {
  return {
    ...a.recipe,
    kind: "fuse",
    mutations: [],
    fusion: {
      domain: b.dna.domain.id,
      mechanic: b.dna.mechanic.id,
      parents: [a.concept.name, b.concept.name],
    },
  };
}
