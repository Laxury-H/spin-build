/**
 * Persisted shapes: storage keys, caps, defaults and the Zod validators that
 * guard everything read back from storage.
 *
 * Reads are hostile by default — a record may come from an older build, a
 * browser extension, a half-written quota failure or a user poking at
 * DevTools. Validation is *structural*: it checks every field the UI renders
 * or indexes (so a bad record can never crash a page) but passes unknown
 * extra fields through untouched, so data written by a newer build survives
 * a round-trip through an older one.
 */
import { z } from "zod";
import { SECTOR_BY_ID } from "@/data/sectors";
import type { DnaKey, HistoryEntry, Idea, Region, SectorId, Settings } from "@/types";
import { DIFFICULTIES, DNA_KEYS, ESTIMATES, REGIONS } from "@/types";

/* ── Keys, caps, defaults ─────────────────────────────────────────────────── */

export const STORAGE_NAMESPACE = "spinbuild";
/** Bump when a persisted shape changes incompatibly; old keys are then simply ignored. */
export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  history: `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:history`,
  settings: `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:settings`,
  recent: `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:recent`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Max history entries. Saved entries are never evicted, so the list can exceed this only when saved alone do. */
export const HISTORY_CAP = 150;
/** Max recent comboKeys remembered for repeat-avoidance. */
export const RECENT_CAP = 50;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  chaos: 42,
  region: "GLOBAL",
  audio: false,
});

/** Chaos is an integer dial, 0–100. Non-finite input falls back to `fallback`. */
export function clampChaos(value: number, fallback: number = DEFAULT_SETTINGS.chaos): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** Locks in canonical DNA order, de-duplicated, unknown keys dropped. */
export function normalizeLocks(values: readonly unknown[]): DnaKey[] {
  return DNA_KEYS.filter((key) => values.includes(key));
}

/* ── Primitive validators ─────────────────────────────────────────────────── */

/** Typed membership check against a readonly list of string literals. */
function oneOf<T extends string>(values: readonly T[], label: string) {
  const allowed: readonly string[] = values;
  return z.custom<T>((v) => typeof v === "string" && allowed.includes(v), {
    message: `Expected ${label}`,
  });
}

const regionSchema = oneOf<Region>(REGIONS, "region");
const sectorSchema = z.custom<SectorId>(
  (v) => typeof v === "string" && Object.hasOwn(SECTOR_BY_ID, v),
  { message: "Expected sector id" },
);
const text = z.string();
const texts = z.array(z.string());
const id = z.string().min(1);
const stackItem = z.looseObject({ layer: text, name: text });

/* ── Idea shape (structural, pass-through) ────────────────────────────────── */

const geneBase = { id, weirdness: z.number(), tags: texts };

const domainShape = z.looseObject({
  ...geneBase,
  sector: sectorSchema,
  label: text,
  short: text,
  activity: text,
  thing: text,
  things: text,
  product: text,
  problems: texts,
  nameWords: texts,
});

const targetShape = z.looseObject({
  ...geneBase,
  label: text,
  short: text,
  plural: text,
  singular: text,
  context: text,
  pains: texts,
  motivations: texts,
  nameWords: texts,
});

const mechanicShape = z.looseObject({
  ...geneBase,
  label: text,
  short: text,
  adjective: text,
  verb: text,
  hook: text,
  loop: texts,
  mvp: texts,
  stack: z.array(stackItem),
  apis: texts,
  complexity: z.number(),
  nameWords: texts,
});

const trendShape = z.looseObject({
  id,
  title: text,
  source: text,
  category: text,
  score: z.number(),
  timestamp: z.number(),
  region: regionSchema,
  tags: texts,
});

const chaosShape = z.looseObject({
  ...geneBase,
  short: text,
  text,
  clause: text,
  twist: text,
  hook: text,
  mvp: text,
  nameWords: texts,
  viral: z.number(),
});

const constraintShape = z.looseObject({
  ...geneBase,
  short: text,
  text,
  implication: text,
  effort: z.number(),
});

const conceptShape = z.looseObject({
  name: text,
  pitch: text,
  hook: text,
  why: text,
  coreLoop: texts,
  mvp: texts,
  stack: z.array(stackItem),
  difficulty: oneOf(DIFFICULTIES, "difficulty"),
  estimate: oneOf(ESTIMATES, "estimate"),
  viral: z.looseObject({ score: z.number(), label: text, reasons: texts }),
});

const recipeShape = z.looseObject({
  v: z.literal(1),
  kind: text,
  seed: text,
  chaos: z.number(),
  region: regionSchema,
  dna: z.looseObject({
    domain: text,
    target: text,
    mechanic: text,
    trend: z.union([z.looseObject({ id: text }), z.looseObject({ title: text })]),
    chaos: text,
    constraint: text,
  }),
  mutations: texts,
});

const ideaShape = z.looseObject({
  id,
  code: id,
  number: text,
  recipe: recipeShape,
  dna: z.looseObject({
    domain: domainShape,
    target: targetShape,
    mechanic: mechanicShape,
    trend: trendShape,
    chaos: chaosShape,
    constraint: constraintShape,
  }),
  fusion: z
    .looseObject({ domain: domainShape, mechanic: mechanicShape, parents: z.tuple([text, text]) })
    .optional(),
  concept: conceptShape,
  autoMutated: z.boolean(),
  boringness: z.number(),
  createdAt: z.number(),
});

/**
 * An Idea that passed the structural check. `z.custom` keeps the value by
 * reference (nothing is stripped or cloned) and types it as `Idea`.
 */
export const ideaSchema = z.custom<Idea>((v) => ideaShape.safeParse(v).success, {
  message: "Malformed idea",
});

export function isIdea(value: unknown): value is Idea {
  return ideaSchema.safeParse(value).success;
}

/* ── Records ──────────────────────────────────────────────────────────────── */

export const historyEntrySchema = z.object({
  id,
  timestamp: z.number(),
  seed: z.string(),
  idea: ideaSchema,
  // Cosmetic fields degrade instead of dropping the whole record.
  locked: z.array(z.unknown()).catch([]).transform(normalizeLocks),
  saved: z.boolean().catch(false),
});

export const settingsSchema = z.object({
  chaos: z.number().catch(DEFAULT_SETTINGS.chaos).transform((n) => clampChaos(n)),
  region: regionSchema.catch(DEFAULT_SETTINGS.region),
  audio: z.boolean().catch(DEFAULT_SETTINGS.audio),
});

/* ── Parsers (never throw) ────────────────────────────────────────────────── */

export interface ParsedHistory {
  /** Valid entries, newest first, unique by id. Not capped. */
  entries: HistoryEntry[];
  /** How many records were discarded as corrupt or duplicate. */
  dropped: number;
}

export function parseHistory(value: unknown): ParsedHistory {
  if (value === null || value === undefined) return { entries: [], dropped: 0 };
  if (!Array.isArray(value)) return { entries: [], dropped: 1 };
  const byId = new Map<string, HistoryEntry>();
  let dropped = 0;
  for (const raw of value) {
    const parsed = historyEntrySchema.safeParse(raw);
    if (!parsed.success) {
      dropped++;
      continue;
    }
    const entry: HistoryEntry = parsed.data;
    const seen = byId.get(entry.id);
    if (seen) {
      dropped++;
      // Keep the most recent copy, but never lose a "saved" flag to a duplicate.
      const winner = entry.timestamp > seen.timestamp ? entry : seen;
      byId.set(entry.id, { ...winner, saved: winner.saved || entry.saved || seen.saved });
      continue;
    }
    byId.set(entry.id, entry);
  }
  const entries = [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
  return { entries, dropped };
}

/** `null` when nothing usable is stored; individual bad fields fall back to defaults. */
export function parseSettings(value: unknown): Settings | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = settingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseRecent(value: unknown, cap: number = RECENT_CAP): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.length > 0 && !out.includes(item)) out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}
