import type { BuildBrief, Idea } from "@/types";

export function buildBrief(idea: Idea): BuildBrief {
  const c = idea.concept;
  const d = idea.dna;

  return {
    product: c.name,
    pitch: c.pitch,
    userProblem: d.domain.problems[0] || `${d.target.plural} struggle with ${d.domain.activity}`,
    coreLoop: c.coreLoop,
    mvpFeatures: c.mvp,
    dataModel: [
      {
        entity: d.domain.thing.replace(/\s+/g, ""),
        fields: ["id: string", "userId: string", "content: string", "status: string", "createdAt: timestamp"],
      },
      {
        entity: "Session",
        fields: ["id: string", "roomCode: string", "chaosLevel: number", "state: json"],
      },
    ],
    requiredApis: d.mechanic.apis.length > 0 ? d.mechanic.apis : ["WebSocket", "localStorage"],
    techStack: c.stack,
    implementationSteps: [
      `Initialize clean repository with Next.js, TypeScript, and Tailwind CSS.`,
      `Implement core data model for ${d.domain.things} and persistence layer.`,
      `Build the ${d.mechanic.label} interaction loop (${d.mechanic.adjective}).`,
      `Enforce the ${d.chaos.short} rule: "${d.chaos.text}"`,
      `Apply the constraint: "${d.constraint.text}"`,
      `Add responsive UI with dark mode, tactile feedback and keyboard shortcuts.`,
    ],
    constraints: [d.constraint.text, d.chaos.text],
  };
}

export function briefToPrompt(idea: Idea, brief: BuildBrief = buildBrief(idea)): string {
  const stack = brief.techStack.map((s) => `${s.layer}: ${s.name}`).join(", ");
  const steps = brief.implementationSteps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  const loop = brief.coreLoop.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const mvp = brief.mvpFeatures.map((f) => `- ${f}`).join("\n");

  return `# SYSTEM PROMPT: BUILD ${brief.product.toUpperCase()}

## Product Overview
**Name:** ${brief.product}
**Pitch:** ${brief.pitch}
**Target Audience:** ${idea.dna.target.label} (${idea.dna.target.context})
**Core Problem:** ${brief.userProblem}

## Core Loop
${loop}

## MVP Feature Checklist
${mvp}

## Technical Constraints & Stack
- **Constraint:** ${idea.dna.constraint.text} (${idea.dna.constraint.implication})
- **Chaos Twist:** ${idea.dna.chaos.text}
- **Recommended Stack:** ${stack}
- **Required APIs:** ${brief.requiredApis.join(", ")}

## Implementation Roadmap
${steps}

Please generate the complete, production-ready codebase adhering to these specifications with zero placeholders.`;
}

export function ideaToText(idea: Idea): string {
  return `${idea.concept.name.toUpperCase()}
"${idea.concept.pitch}"

DNA:
- DOMAIN: ${idea.dna.domain.label}
- TARGET: ${idea.dna.target.label}
- MECHANIC: ${idea.dna.mechanic.label}
- TREND: ${idea.dna.trend.title}
- CHAOS (${idea.recipe.chaos}%): ${idea.dna.chaos.short} — ${idea.dna.chaos.text}
- CONSTRAINT: ${idea.dna.constraint.short} — ${idea.dna.constraint.text}

ESTIMATE: ${idea.concept.estimate} | DIFFICULTY: ${idea.concept.difficulty}`;
}

export function ideaShareText(idea: Idea, url: string): string {
  return `Check out ${idea.concept.name.toUpperCase()} — "${idea.concept.pitch}" on SPIN//BUILD: ${url}`;
}
