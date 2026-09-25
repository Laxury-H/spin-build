import type { DnaKey, Idea } from "@/types";
import { TARGETS, MECHANICS } from "@/data";
import { createRng } from "@/lib/random";

export type NodeType = "concept" | "gene" | "adjacent" | "mutation";
export type EdgeType = "core" | "synergy" | "contrast" | "alternative";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  geneKey?: DnaKey;
  tags: string[];
  group: string;
  weirdness?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  strength: number; // 0.0 to 1.0
}

export interface NeuralGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  density: number; // overall interconnectedness
  coherence: number; // synergy vs contrast ratio
}

function findSharedTags(a: string[], b: string[]): string[] {
  return a.filter((tag) => b.includes(tag));
}

/**
 * Builds a neural network knowledge graph from an Idea.
 * Deterministic based on the idea's seed.
 */
export function buildNeuralGraph(idea: Idea): NeuralGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const rng = createRng(`${idea.recipe.seed}:graph`);

  // 1. Center Concept Node
  const conceptId = `concept-${idea.id}`;
  nodes.push({
    id: conceptId,
    label: idea.concept.name,
    type: "concept",
    tags: [],
    group: "center",
  });

  // 2. Core Gene Nodes
  const dna = idea.dna;
  const geneNodes: Record<DnaKey, GraphNode> = {
    domain: { id: `gene-domain`, label: dna.domain.short, type: "gene", geneKey: "domain", tags: dna.domain.tags || [], group: "domain", weirdness: dna.domain.weirdness },
    target: { id: `gene-target`, label: dna.target.short, type: "gene", geneKey: "target", tags: dna.target.tags || [], group: "target", weirdness: dna.target.weirdness },
    mechanic: { id: `gene-mechanic`, label: dna.mechanic.short, type: "gene", geneKey: "mechanic", tags: dna.mechanic.tags || [], group: "mechanic", weirdness: dna.mechanic.weirdness },
    trend: { id: `gene-trend`, label: dna.trend.title.toUpperCase(), type: "gene", geneKey: "trend", tags: dna.trend.tags || [], group: "trend", weirdness: 50 },
    chaos: { id: `gene-chaos`, label: dna.chaos.short, type: "gene", geneKey: "chaos", tags: dna.chaos.tags || [], group: "chaos", weirdness: dna.chaos.weirdness },
    constraint: { id: `gene-constraint`, label: dna.constraint.short, type: "gene", geneKey: "constraint", tags: dna.constraint.tags || [], group: "constraint", weirdness: dna.constraint.weirdness },
  };

  const keys = Object.keys(geneNodes) as DnaKey[];
  for (const key of keys) {
    nodes.push(geneNodes[key]);
    // Connect to center
    edges.push({
      source: conceptId,
      target: geneNodes[key].id,
      type: "core",
      strength: 1.0,
    });
  }

  // 3. Synergies (Shared Tags) & Contrasts (Weirdness gaps) between genes
  let synergyCount = 0;
  let contrastCount = 0;

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = geneNodes[keys[i]];
      const b = geneNodes[keys[j]];
      
      const shared = findSharedTags(a.tags, b.tags);
      if (shared.length > 0) {
        edges.push({
          source: a.id,
          target: b.id,
          type: "synergy",
          label: shared[0].toUpperCase(),
          strength: Math.min(1.0, 0.4 + shared.length * 0.2),
        });
        synergyCount++;
      } else if (a.weirdness !== undefined && b.weirdness !== undefined) {
        const gap = Math.abs(a.weirdness - b.weirdness);
        if (gap > 40) {
          edges.push({
            source: a.id,
            target: b.id,
            type: "contrast",
            label: `Δ${Math.round(gap)} CHAOS`,
            strength: Math.min(1.0, gap / 100),
          });
          contrastCount++;
        }
      }
    }
  }

  // 4. Adjacent Possibilities (Mutation paths based on tags)
  const altMechanics = MECHANICS.filter(m => 
    m.id !== dna.mechanic.id && findSharedTags(m.tags || [], dna.mechanic.tags || []).length > 0
  );
  if (altMechanics.length > 0) {
    const picked = rng.pick(altMechanics);
    const id = `adj-mech-${picked.id}`;
    nodes.push({
      id,
      label: picked.short,
      type: "adjacent",
      geneKey: "mechanic",
      tags: picked.tags || [],
      group: "mechanic",
    });
    edges.push({
      source: geneNodes.mechanic.id,
      target: id,
      type: "alternative",
      label: "ALT VECTOR",
      strength: 0.6,
    });
  }

  const altTargets = TARGETS.filter(t => 
    t.id !== dna.target.id && findSharedTags(t.tags || [], dna.target.tags || []).length > 0
  );
  if (altTargets.length > 0) {
    const picked = rng.pick(altTargets);
    const id = `adj-target-${picked.id}`;
    nodes.push({
      id,
      label: picked.short,
      type: "adjacent",
      geneKey: "target",
      tags: picked.tags || [],
      group: "target",
    });
    edges.push({
      source: geneNodes.target.id,
      target: id,
      type: "alternative",
      label: "LATERAL SHIFT",
      strength: 0.5,
    });
  }

  const totalPossibleConnections = (keys.length * (keys.length - 1)) / 2;
  const density = (synergyCount + contrastCount) / totalPossibleConnections;
  const coherence = Math.max(0, synergyCount / Math.max(1, synergyCount + contrastCount));

  return { nodes, edges, density, coherence };
}
