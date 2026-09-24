/**
 * SPIN//BUILD — Sample Ideas Review CLI
 * Generates sample ideas across chaos bands to inspect generation quality,
 * boringness detector, and format fidelity.
 */
import { spinIdea, dailyIdea, fuseIdeas } from "../lib/generator";

function hr(char = "─", len = 78): string {
  return char.repeat(len);
}

function printIdeaBlock(title: string, idea: ReturnType<typeof spinIdea>) {
  console.log("\n" + hr("━"));
  console.log(`[ ${title} ]  //  CODE: ${idea.code}  //  CHAOS: ${idea.recipe.chaos}%`);
  console.log(hr("─"));
  console.log(`NAME:     ${idea.concept.name.toUpperCase()}`);
  console.log(`PITCH:    ${idea.concept.pitch}`);
  console.log(`HOOK:     ${idea.concept.hook}`);
  console.log(`WHY:      ${idea.concept.why}`);
  console.log(hr("┄"));
  console.log(`DNA:`);
  console.log(`  • DOMAIN:     ${idea.dna.domain.label} [${idea.dna.domain.short}] (${idea.dna.domain.product})`);
  console.log(`  • TARGET:     ${idea.dna.target.label} [${idea.dna.target.short}]`);
  console.log(`  • MECHANIC:   ${idea.dna.mechanic.label} [${idea.dna.mechanic.verb}]`);
  console.log(`  • TREND:      ${idea.dna.trend.title}`);
  console.log(`  • CHAOS:      ${idea.dna.chaos.short} — "${idea.dna.chaos.text}" (weirdness: ${idea.dna.chaos.weirdness})`);
  console.log(`  • CONSTRAINT: ${idea.dna.constraint.short} — "${idea.dna.constraint.text}"`);
  console.log(hr("┄"));
  console.log(`SPECS:    Difficulty: ${idea.concept.difficulty} | Estimate: ${idea.concept.estimate} | Viral: ${idea.concept.viral.label} (${idea.concept.viral.score}/100)`);
  if (idea.autoMutated) {
    console.log(`ALERT:    ⚡ AUTO-MUTATED (Boringness score: ${idea.boringness}/100)`);
  }
  if (idea.recipe.mutations.length > 0) {
    console.log(`MUTATIONS: ${idea.recipe.mutations.join(", ")}`);
  }
}

async function main() {
  console.log(hr("═"));
  console.log("  SPIN//BUILD — QUALITY SAMPLER RUNNER");
  console.log("  Testing procedural idea generation across chaos bands");
  console.log(hr("═"));

  // 1. Sane / Low Chaos
  const sane = spinIdea({ chaos: 15, region: "GLOBAL" });
  printIdeaBlock("BAND 1: SANE / PRODUCTIVE (15% Chaos)", sane);

  // 2. Balanced / Mid Chaos
  const balanced = spinIdea({ chaos: 45, region: "GLOBAL" });
  printIdeaBlock("BAND 2: BALANCED / EXPERIMENTAL (45% Chaos)", balanced);

  // 3. High Chaos / Unhinged
  const wild = spinIdea({ chaos: 85, region: "GLOBAL" });
  printIdeaBlock("BAND 3: WILD / UNHINGED (85% Chaos)", wild);

  // 4. Cursed Spin
  const cursed = spinIdea({ chaos: 100, kind: "cursed", region: "GLOBAL" });
  printIdeaBlock("BAND 4: CURSED / MAXIMUM CHAOS (100% Chaos)", cursed);

  // 5. Daily Spin
  const daily = dailyIdea();
  printIdeaBlock("DAILY SYNCHRONIZED SEED", daily);

  // 6. Fusion concept
  const fused = fuseIdeas(sane, wild);
  printIdeaBlock("FUSION CHAMBER (Sane × Wild)", fused);

  console.log("\n" + hr("═"));
  console.log("✓ Sample generation complete. 6 test concepts synthesized deterministically.");
  console.log(hr("═") + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

