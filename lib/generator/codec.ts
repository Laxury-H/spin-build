/**
 * Share-code codec for idea recipes.
 *
 * A code is a dot-separated list of URL-safe tokens (alphabet [A-Za-z0-9._~-]):
 *
 *   1.k7f3a9x.42.gl.s.study-room.university-students.multiplayer.ai-agents.hostile-ux.no-login
 *   │ │       │  │  │ └ domain    └ target            └ mechanic  └ trend   └ chaos    └ constraint
 *   │ │       │  │  └ kind: s spin · d daily · f fuse · c cursed (+ "a" when auto-mutated)
 *   │ │       │  └ region: gl | vn
 *   │ │       └ chaos 0–100
 *   │ └ seed
 *   └ format version
 *
 * followed by optional tail tokens, in this order:
 *   m-weird-viral                      mutations, in order
 *   f~<domain>~<mechanic>~<A>~<B>      FUSE genes; parent names base64url(UTF-8)
 *
 * Token encodings:
 *   ids     kebab-case verbatim, otherwise "_" + base64url(UTF-8)
 *   seed    [A-Za-z0-9-]+ verbatim, otherwise "_" + base64url(UTF-8)
 *   trend   curated "curated:<slug>" → "<slug>"; other ids → "_" + base64url(id);
 *           live trends inline → "~" + base64url(JSON {t,c,s,g})
 *
 * Codes are canonical: `decodeRecipe` only accepts a code that `encodeRecipe`
 * would produce for the decoded recipe, so every recipe has exactly one code
 * (ideas use their code as id). `decodeRecipe` never throws.
 */
import { z } from "zod";
import type {
  IdeaKind,
  IdeaRecipe,
  MutationKind,
  Region,
  TrendCategory,
  TrendRef,
  TrendSourceId,
} from "@/types";
import { REGIONS, TREND_SOURCE_LABEL } from "@/types";

export const CODE_VERSION = "1";
export const MAX_CODE_LENGTH = 4096;
export const MAX_SEED_LENGTH = 64;
export const MAX_MUTATIONS = 200;
const MAX_ID_LENGTH = 120;

/* ────────────────────────────────────────────────────────────────────────── */
/* Enumerations (exhaustive by construction)                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const KIND_TOKEN = { spin: "s", daily: "d", fuse: "f", cursed: "c" } as const satisfies Record<
  IdeaKind,
  string
>;
const REGION_TOKEN = { GLOBAL: "gl", VN: "vn" } as const satisfies Record<Region, string>;
const MUTATION_SET = {
  useful: true,
  viral: true,
  weird: true,
  technical: true,
  social: true,
  simpler: true,
  harder: true,
  cheaper: true,
  chaotic: true,
} as const satisfies Record<MutationKind, true>;
const CATEGORY_SET = {
  AI: true,
  TECH: true,
  CULTURE: true,
  MEME: true,
  MUSIC: true,
  VIDEO: true,
  LIFESTYLE: true,
  FINANCE: true,
  GAMING: true,
  SPORTS: true,
  NEWS: true,
  SCIENCE: true,
  DESIGN: true,
  OTHER: true,
} as const satisfies Record<TrendCategory, true>;

const KINDS = Object.keys(KIND_TOKEN) as IdeaKind[];
const MUTATION_KINDS = Object.keys(MUTATION_SET) as MutationKind[];
const CATEGORIES = Object.keys(CATEGORY_SET) as TrendCategory[];
const SOURCES = Object.keys(TREND_SOURCE_LABEL) as TrendSourceId[];

const KIND_BY_TOKEN: ReadonlyMap<string, IdeaKind> = new Map(
  KINDS.map((k) => [KIND_TOKEN[k], k] as const),
);
const REGION_BY_TOKEN: ReadonlyMap<string, Region> = new Map(
  REGIONS.map((r) => [REGION_TOKEN[r], r] as const),
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Schemas                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const idSchema = z.string().min(1).max(MAX_ID_LENGTH);

export const trendRefSchema = z.union([
  z.object({ id: z.string().min(1).max(160) }),
  z.object({
    title: z.string().min(1).max(120),
    category: z.enum(CATEGORIES),
    source: z.enum(SOURCES),
    tags: z.array(z.string().min(1).max(48)).max(24),
  }),
]);

/**
 * Structural validation of an IdeaRecipe (share codes, stored history).
 * Unknown keys are stripped; chaos must already be an integer.
 */
export const ideaRecipeSchema = z.object({
  v: z.literal(1),
  kind: z.enum(KINDS),
  seed: z.string().min(1).max(MAX_SEED_LENGTH),
  chaos: z.number().int().min(0).max(100),
  region: z.enum(REGIONS),
  dna: z.object({
    domain: idSchema,
    target: idSchema,
    mechanic: idSchema,
    trend: trendRefSchema,
    chaos: idSchema,
    constraint: idSchema,
  }),
  mutations: z.array(z.enum(MUTATION_KINDS)).max(MAX_MUTATIONS),
  auto: z.boolean().optional(),
  fusion: z
    .object({
      domain: idSchema,
      mechanic: idSchema,
      parents: z.tuple([z.string().max(120), z.string().max(120)]),
    })
    .optional(),
});

/** Compact inline snapshot of a live trend inside a code. */
const inlineTrendSchema = z.strictObject({
  t: z.string().min(1).max(120),
  c: z.enum(CATEGORIES),
  s: z.enum(SOURCES),
  g: z.array(z.string().min(1).max(48)).max(24),
});

/** Validate an untrusted recipe-shaped value. */
export function parseRecipe(value: unknown): IdeaRecipe | null {
  const result = ideaRecipeSchema.safeParse(value);
  if (!result.success) return null;
  const recipe: IdeaRecipe = result.data;
  // Canonical form: `auto` is present only when true.
  if (recipe.auto !== true) delete recipe.auto;
  return recipe;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* base64url + UTF-8                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const B64_INDEX: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) table[B64.charCodeAt(i)] = i;
  return table;
})();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63];
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63];
  }
  return out;
}

/** Strict, unpadded base64url → bytes. Rejects foreign chars and non-canonical trailing bits. */
export function base64UrlToBytes(text: string): Uint8Array | null {
  if (text.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? B64_INDEX[code] : -1;
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >>> bits) & 0xff;
    }
    buffer &= (1 << bits) - 1;
  }
  return buffer === 0 ? out : null;
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function encodeText(text: string): string {
  return bytesToBase64Url(utf8Encoder.encode(text));
}

export function decodeText(token: string): string | null {
  const bytes = base64UrlToBytes(token);
  if (!bytes) return null;
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tokens                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const RAW_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RAW_SEED = /^[A-Za-z0-9-]+$/;
const CHAOS_TOKEN = /^(?:0|[1-9]\d{0,2})$/;
const KIND_FLAGS = /^([a-z])(a?)$/;
const CURATED_PREFIX = "curated:";
const ENCODED = "_";
const INLINE = "~";
const MUTATIONS_PREFIX = "m-";
const FUSION_PREFIX = "f~";
const BASE_TOKENS = 11;

function encodeId(id: string): string {
  return RAW_ID.test(id) ? id : ENCODED + encodeText(id);
}

function decodeId(token: string): string | null {
  if (RAW_ID.test(token)) return token;
  if (token.startsWith(ENCODED)) return decodeText(token.slice(1));
  return null;
}

function encodeSeed(seed: string): string {
  return RAW_SEED.test(seed) ? seed : ENCODED + encodeText(seed);
}

function decodeSeed(token: string): string | null {
  if (RAW_SEED.test(token)) return token;
  if (token.startsWith(ENCODED)) return decodeText(token.slice(1));
  return null;
}

function encodeTrend(ref: TrendRef): string {
  if ("id" in ref) {
    const slug = ref.id.startsWith(CURATED_PREFIX) ? ref.id.slice(CURATED_PREFIX.length) : "";
    return RAW_ID.test(slug) ? slug : ENCODED + encodeText(ref.id);
  }
  const inline = { t: ref.title, c: ref.category, s: ref.source, g: ref.tags };
  return INLINE + encodeText(JSON.stringify(inline));
}

function decodeTrend(token: string): TrendRef | null {
  if (RAW_ID.test(token)) return { id: CURATED_PREFIX + token };
  if (token.startsWith(ENCODED)) {
    const id = decodeText(token.slice(1));
    return id === null ? null : { id };
  }
  if (token.startsWith(INLINE)) {
    const json = decodeText(token.slice(1));
    if (json === null) return null;
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      return null;
    }
    const parsed = inlineTrendSchema.safeParse(value);
    if (!parsed.success) return null;
    const { t, c, s, g } = parsed.data;
    return { title: t, category: c, source: s, tags: g };
  }
  return null;
}

function normalizeChaos(chaos: number): number {
  return Number.isFinite(chaos) ? Math.min(100, Math.max(0, Math.round(chaos))) : 50;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Public API                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Recipe → share code. URL-safe, versioned, deterministic. Chaos is written as
 * a clamped integer. Any recipe that satisfies `ideaRecipeSchema` round-trips
 * through `decodeRecipe` exactly (with `auto: false` normalized away).
 */
export function encodeRecipe(recipe: IdeaRecipe): string {
  const d = recipe.dna;
  const tokens = [
    CODE_VERSION,
    encodeSeed(recipe.seed),
    String(normalizeChaos(recipe.chaos)),
    REGION_TOKEN[recipe.region] ?? REGION_TOKEN.GLOBAL,
    (KIND_TOKEN[recipe.kind] ?? KIND_TOKEN.spin) + (recipe.auto === true ? "a" : ""),
    encodeId(d.domain),
    encodeId(d.target),
    encodeId(d.mechanic),
    encodeTrend(d.trend),
    encodeId(d.chaos),
    encodeId(d.constraint),
  ];
  if (recipe.mutations.length > 0) tokens.push(MUTATIONS_PREFIX + recipe.mutations.join("-"));
  if (recipe.fusion) {
    const f = recipe.fusion;
    tokens.push(
      FUSION_PREFIX +
        [encodeId(f.domain), encodeId(f.mechanic), encodeText(f.parents[0]), encodeText(f.parents[1])].join(
          "~",
        ),
    );
  }
  return tokens.join(".");
}

function decodeUnchecked(code: string): IdeaRecipe | null {
  const tokens = code.split(".");
  if (tokens.length < BASE_TOKENS || tokens[0] !== CODE_VERSION) return null;

  const seed = decodeSeed(tokens[1]);
  if (seed === null) return null;
  if (!CHAOS_TOKEN.test(tokens[2])) return null;
  const chaos = Number(tokens[2]);
  const region = REGION_BY_TOKEN.get(tokens[3]);
  const flags = KIND_FLAGS.exec(tokens[4]);
  const kind = flags ? KIND_BY_TOKEN.get(flags[1]) : undefined;
  if (!region || !flags || !kind) return null;

  const domain = decodeId(tokens[5]);
  const target = decodeId(tokens[6]);
  const mechanic = decodeId(tokens[7]);
  const trend = decodeTrend(tokens[8]);
  const chaosId = decodeId(tokens[9]);
  const constraint = decodeId(tokens[10]);
  if (domain === null || target === null || mechanic === null || trend === null) return null;
  if (chaosId === null || constraint === null) return null;

  let index = BASE_TOKENS;
  let mutations: string[] = [];
  const mutationToken = tokens[index];
  if (mutationToken !== undefined && mutationToken.startsWith(MUTATIONS_PREFIX)) {
    mutations = mutationToken.slice(MUTATIONS_PREFIX.length).split("-");
    index++;
  }
  let fusion: { domain: string; mechanic: string; parents: [string, string] } | undefined;
  const fusionToken = tokens[index];
  if (fusionToken !== undefined && fusionToken.startsWith(FUSION_PREFIX)) {
    const parts = fusionToken.slice(FUSION_PREFIX.length).split("~");
    if (parts.length !== 4) return null;
    const fDomain = decodeId(parts[0]);
    const fMechanic = decodeId(parts[1]);
    const parentA = decodeText(parts[2]);
    const parentB = decodeText(parts[3]);
    if (fDomain === null || fMechanic === null || parentA === null || parentB === null) return null;
    fusion = { domain: fDomain, mechanic: fMechanic, parents: [parentA, parentB] };
    index++;
  }
  if (index !== tokens.length) return null;

  return parseRecipe({
    v: 1,
    kind,
    seed,
    chaos,
    region,
    dna: { domain, target, mechanic, trend, chaos: chaosId, constraint },
    mutations,
    ...(flags[2] === "a" ? { auto: true } : {}),
    ...(fusion ? { fusion } : {}),
  });
}

/** Share code → recipe. Returns null on any malformed or non-canonical input; never throws. */
export function decodeRecipe(code: string): IdeaRecipe | null {
  try {
    if (typeof code !== "string") return null;
    const trimmed = code.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CODE_LENGTH) return null;
    const recipe = decodeUnchecked(trimmed);
    if (!recipe) return null;
    return encodeRecipe(recipe) === trimmed ? recipe : null;
  } catch {
    return null;
  }
}

/** True when a string has the shape of a share code (cheap pre-check for routing). */
export function looksLikeCode(value: string): boolean {
  return /^[A-Za-z0-9._~-]+$/.test(value) && value.startsWith(`${CODE_VERSION}.`);
}
