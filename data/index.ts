/**
 * Dataset barrel + lookups. Pure data, safe to import from server and client.
 * Individual dataset files are authored independently; this file only joins them.
 */
import type {
  ChaosModifier,
  Constraint,
  Domain,
  Mechanic,
  SectorId,
  Target,
  Trend,
  TrendLexiconEntry,
} from "@/types";
import { CHAOS_MILD } from "./chaos-mild";
import { CHAOS_WILD } from "./chaos-wild";
import { CONSTRAINTS } from "./constraints";
import { DOMAINS } from "./domains";
import { MECHANICS } from "./mechanics";
import { TARGETS } from "./targets";
import { TREND_LEXICON } from "./trend-lexicon";
import { FALLBACK_TRENDS } from "./trends-fallback";

export { SECTORS, SECTOR_BY_ID, sectorPosition } from "./sectors";
export { DOMAINS, TARGETS, MECHANICS, CONSTRAINTS, FALLBACK_TRENDS, TREND_LEXICON };

/** All chaos modifiers (mild + wild), de-duplicated by id (first wins). */
export const CHAOS_MODIFIERS: ChaosModifier[] = dedupe([...CHAOS_MILD, ...CHAOS_WILD]);

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

function indexById<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((it) => [it.id, it]));
}

const domainMap = indexById(DOMAINS);
const targetMap = indexById(TARGETS);
const mechanicMap = indexById(MECHANICS);
const chaosMap = indexById(CHAOS_MODIFIERS);
const constraintMap = indexById(CONSTRAINTS);
const trendMap = indexById(FALLBACK_TRENDS);
const lexiconMap = indexById(TREND_LEXICON);

export const getDomain = (id: string): Domain | undefined => domainMap.get(id);
export const getTarget = (id: string): Target | undefined => targetMap.get(id);
export const getMechanic = (id: string): Mechanic | undefined => mechanicMap.get(id);
export const getChaosModifier = (id: string): ChaosModifier | undefined => chaosMap.get(id);
export const getConstraint = (id: string): Constraint | undefined => constraintMap.get(id);
export const getFallbackTrend = (id: string): Trend | undefined => trendMap.get(id);
export const getLexiconEntry = (id: string): TrendLexiconEntry | undefined => lexiconMap.get(id);

export function domainsInSector(sector: SectorId): Domain[] {
  return DOMAINS.filter((d) => d.sector === sector);
}

/** Total number of curated atoms in the pool (shown as "POOL: N IDEAS"). */
export const POOL_ATOMS =
  DOMAINS.length +
  TARGETS.length +
  MECHANICS.length +
  CHAOS_MODIFIERS.length +
  CONSTRAINTS.length +
  FALLBACK_TRENDS.length;

/** Number of distinct DNA combinations from curated data alone. */
export const POOL_COMBINATIONS =
  DOMAINS.length *
  TARGETS.length *
  MECHANICS.length *
  CHAOS_MODIFIERS.length *
  CONSTRAINTS.length *
  Math.max(1, FALLBACK_TRENDS.length);
