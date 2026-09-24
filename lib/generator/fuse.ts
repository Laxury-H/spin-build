import type { Idea, IdeaRecipe } from "@/types";
import type { Rng } from "@/lib/random";

export function planFusion(a: Idea, b: Idea, rng: Rng): IdeaRecipe {
  const blendChaos = Math.round((a.recipe.chaos + b.recipe.chaos) / 2);
  const pickedChaos = rng.chance(0.5) ? a.recipe.dna.chaos : b.recipe.dna.chaos;
  const pickedConstraint = rng.chance(0.5) ? a.recipe.dna.constraint : b.recipe.dna.constraint;

  return {
    ...a.recipe,
    kind: "fuse",
    chaos: blendChaos,
    dna: {
      ...a.recipe.dna,
      chaos: pickedChaos,
      constraint: pickedConstraint,
    },
    mutations: [],
    fusion: {
      domain: b.dna.domain.id,
      mechanic: b.dna.mechanic.id,
      parents: [a.concept.name, b.concept.name],
    },
  };
}
