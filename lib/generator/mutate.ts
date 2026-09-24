import type { IdeaRecipe, MutationKind } from "@/types";
import type { Rng } from "@/lib/random";

export function planMutation(recipe: IdeaRecipe, kind: MutationKind, rng: Rng): IdeaRecipe {
  let chaos = recipe.chaos;
  if (kind === "chaotic" || kind === "weird") {
    chaos = Math.min(100, chaos + rng.int(5, 20));
  } else if (kind === "simpler" || kind === "cheaper") {
    chaos = Math.max(0, chaos - rng.int(5, 15));
  }
  return {
    ...recipe,
    chaos,
    mutations: [...recipe.mutations, kind],
  };
}
