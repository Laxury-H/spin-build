import type { IdeaRecipe, MutationKind } from "@/types";
import type { Rng } from "@/lib/random";

/** STUB — replaced by engine-synth. Signature is contractual. */
export function planMutation(recipe: IdeaRecipe, kind: MutationKind, _rng: Rng): IdeaRecipe {
  return { ...recipe, mutations: [...recipe.mutations, kind] };
}
