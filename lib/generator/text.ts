/**
 * Text plumbing for the synthesizer.
 *
 * Datasets are written as fragments with a tiny placeholder grammar (see
 * docs/ARCHITECTURE.md §2.1). This module turns those fragments into clean
 * English: placeholder filling, a/an agreement, sentence hygiene, list joins,
 * and the "angle" a trend contributes to a product.
 *
 * Everything here is pure and deterministic.
 */
import type { Domain, Target, Trend, TrendCategory, TrendLexiconEntry } from "@/types";
import { TREND_LEXICON } from "@/data";
import { hashString } from "@/lib/random";

/* ────────────────────────────────────────────────────────────────────────── */
/* Placeholders                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export const PLACEHOLDER_KEYS = [
  "users",
  "user",
  "activity",
  "thing",
  "things",
  "product",
  "trend",
] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

/** The slice of an idea's DNA that placeholders read from. `IdeaDNA` satisfies it. */
export interface FillSource {
  domain: Pick<Domain, "activity" | "thing" | "things" | "product">;
  target: Pick<Target, "plural" | "singular">;
  trend: Pick<Trend, "title">;
}

/** Neutral stand-ins when a dataset field is unexpectedly empty. */
const PLACEHOLDER_FALLBACK: Record<PlaceholderKey, string> = {
  users: "people",
  user: "someone",
  activity: "it",
  thing: "entry",
  things: "entries",
  product: "tool",
  trend: "the moment",
};

const PLACEHOLDER_SET: ReadonlySet<string> = new Set(PLACEHOLDER_KEYS);

export function isPlaceholderKey(key: string): key is PlaceholderKey {
  return PLACEHOLDER_SET.has(key);
}

export function placeholderValues(dna: FillSource): Record<PlaceholderKey, string> {
  const pick = (value: string | undefined, key: PlaceholderKey) => {
    const v = (value ?? "").trim();
    return v.length > 0 ? v : PLACEHOLDER_FALLBACK[key];
  };
  return {
    users: pick(dna.target.plural, "users"),
    user: pick(dna.target.singular, "user"),
    activity: pick(dna.domain.activity, "activity"),
    thing: pick(dna.domain.thing, "thing"),
    things: pick(dna.domain.things, "things"),
    product: pick(dna.domain.product, "product"),
    trend: pick(dna.trend.title, "trend"),
  };
}

/**
 * Resolve `{users} {user} {activity} {thing} {things} {product} {trend}` and
 * repair the grammar around them (articles, spacing). Unknown placeholders are
 * left intact; this never throws.
 */
export function fill(template: string, dna: FillSource): string {
  if (!template) return "";
  const values = placeholderValues(dna);
  const out = template.replace(/\{([A-Za-z]+)\}/g, (match: string, key: string) =>
    isPlaceholderKey(key) ? values[key] : match,
  );
  return fixArticles(tidy(out));
}

/** Placeholders (`{name}`) still present in a string — for tests and guards. */
export function unresolvedPlaceholders(text: string): string[] {
  const found: string[] = [];
  const re = /\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) found.push(m[1]);
  return found;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Articles                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/** Letters whose spoken name starts with a vowel sound: "an F", "an S", "an X". */
const VOWEL_SOUND_LETTERS = new Set(["a", "e", "f", "h", "i", "l", "m", "n", "o", "r", "s", "x"]);

/** Consonant-spelled words that open with a vowel sound. */
const SILENT_H = /^(hour|honest|honor|honour|heir)/;

/** Vowel-spelled words that open with a consonant sound ("a user", "a euro", "a one-screen"). */
const YOU_SOUND = /^(uni(?![nm])|use|usu|usa|uti|uto|ubi|uku|ura(?!l)|eu|ewe)/;

function isAcronym(seg: string): boolean {
  return /^[A-Z0-9]{2,}s?$/.test(seg) && /[A-Z]/.test(seg);
}

/**
 * Does `word` start with a vowel *sound*? Handles acronyms read letter by letter
 * ("an AI", "a URL", "an NFC"), pronounceable acronyms ("a FOMO", "an OLED"),
 * silent h ("an hour"), you-sounds ("a user", "a unicorn"), "one" ("a one-screen"),
 * letter prefixes ("an e-ink", "an x-ray", "a t-shirt") and numbers ("an 8-bit",
 * "an 11-minute", "a 3D").
 */
export function startsWithVowelSound(word: string): boolean {
  const clean = word.replace(/^[^A-Za-z0-9]+/, "");
  if (!clean) return false;

  const digits = /^\d+/.exec(clean);
  if (digits) {
    const d = digits[0];
    if (d[0] === "8") return true;
    if ((d.startsWith("11") || d.startsWith("18")) && (d.length === 2 || d.length === 5 || d.length === 8)) {
      return true;
    }
    return false;
  }

  const seg = clean.split(/[-–—/.'’_]/)[0] || clean;
  if (seg.length === 1) return VOWEL_SOUND_LETTERS.has(seg.toLowerCase());

  if (isAcronym(seg)) {
    const letters = seg.replace(/s$/, "");
    const pronounceable = letters.length >= 4 && /[AEIOU]/.test(letters) && !/^[AEIOU]+$/.test(letters);
    if (!pronounceable) return VOWEL_SOUND_LETTERS.has(letters[0].toLowerCase());
    // Pronounced as a word: fall through to word rules on the lowercase form.
  }

  const lower = seg.toLowerCase();
  if (lower === "one" || lower === "once" || lower === "oneself") return false;
  if (SILENT_H.test(lower)) return true;
  if (YOU_SOUND.test(lower)) return false;
  return /^[aeiou]/.test(lower);
}

/** "a" or "an" for the word that follows. */
export function article(word: string): "a" | "an" {
  return startsWithVowelSound(word) ? "an" : "a";
}

/** Prefix a noun phrase with the right indefinite article: withArticle("AI coach") → "an AI coach". */
export function withArticle(phrase: string): string {
  const p = phrase.trim();
  return p ? `${article(p)} ${p}` : p;
}

const LEADING_PUNCT = /^[("“'‘[]*/;

/**
 * Repair a/an agreement across a whole string. Lowercase "a"/"an" and "An" are
 * always articles; a capital "A" is only treated as one at a sentence start
 * (so "Plan A or B" survives).
 */
export function fixArticles(text: string): string {
  const parts = text.split(/(\s+)/);
  for (let i = 0; i < parts.length; i += 2) {
    const token = parts[i];
    const m = /^([("“'‘[]*)(a|an|A|An|AN)$/.exec(token);
    if (!m) continue;
    const next = parts[i + 2];
    if (next === undefined || next.length === 0) continue;
    const art = m[2];
    if (art === "A" && !atSentenceStart(parts, i)) continue;
    const firstChar = next.replace(LEADING_PUNCT, "")[0];
    if (!firstChar || !/[A-Za-z0-9]/.test(firstChar)) continue;
    const want = article(next);
    let replacement: string;
    if (art === "AN") replacement = want === "an" ? "AN" : "A";
    else if (art[0] === "A") replacement = want === "an" ? "An" : "A";
    else replacement = want;
    parts[i] = m[1] + replacement;
  }
  return parts.join("");
}

function atSentenceStart(parts: string[], index: number): boolean {
  if (index === 0) return true;
  const prev = parts[index - 2];
  if (prev === undefined) return true;
  return /[.!?:;—–]["”’)]?$/.test(prev) || prev === "-" || prev === "—";
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sentences                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/** Collapse whitespace and remove spaces before punctuation. */
export function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])(?=\s|$)/g, "$1")
    .replace(/,\s*,/g, ",")
    .trim();
}

const PROPER_STARTS = new Set([
  "google", "spotify", "youtube", "tiktok", "instagram", "discord", "reddit", "slack", "github",
  "wikipedia", "apple", "android", "windows", "linux", "chrome", "firefox", "safari", "figma",
  "notion", "zoom", "whatsapp", "telegram", "zalo", "shopee", "grab", "netflix", "twitch",
  "steam", "minecraft", "roblox", "excel", "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday", "english", "vietnamese", "hanoi", "saigon", "i",
]);

/** Does this string open with something that must keep its capital (acronym, brand, "I")? */
export function startsWithProperNoun(text: string): boolean {
  const word = text.replace(LEADING_PUNCT, "").split(/[\s,;:.!?]/)[0] ?? "";
  if (!word) return false;
  if (/[A-Z]/.test(word.slice(1))) return true; // AI, QR, iOS-style, YouTube
  const bare = word.toLowerCase().replace(/['’]s$/, "").replace(/[^a-z]/g, "");
  return PROPER_STARTS.has(bare);
}

/** Uppercase the first letter (skipping leading quotes/brackets). Leaves "iOS"-style words alone. */
export function capitalize(text: string): string {
  const lead = LEADING_PUNCT.exec(text)?.[0] ?? "";
  const rest = text.slice(lead.length);
  if (!rest) return text;
  const word = rest.split(/\s/)[0];
  if (word.length > 1 && /[a-z]/.test(word[0]) && /[A-Z]/.test(word.slice(1))) return text;
  return lead + rest[0].toUpperCase() + rest.slice(1);
}

/** Lowercase the first letter so a sentence can continue another one — unless it opens with a proper noun. */
export function lowerFirst(text: string): string {
  if (!text || startsWithProperNoun(text)) return text;
  const lead = LEADING_PUNCT.exec(text)?.[0] ?? "";
  const rest = text.slice(lead.length);
  if (!rest) return text;
  return lead + rest[0].toLowerCase() + rest.slice(1);
}

/** Remove trailing punctuation (and dangling dashes) so a fragment can be embedded mid-sentence. */
export function stripTerminal(text: string): string {
  return text.trim().replace(/[\s.,;:!?…—–-]+$/, "").trim();
}

/**
 * Normalize into exactly one sentence-shaped string: tidy spacing, fixed
 * articles, capital first letter and a single terminal mark. `terminal` is used
 * unless the text already ends in "?" / "!" and `keepMark` is true.
 */
export function sentence(text: string, opts: { terminal?: "." | "!" | "?"; keepMark?: boolean } = {}): string {
  const terminal = opts.terminal ?? ".";
  let t = tidy(text);
  if (!t) return "";
  // Closing quote after a terminal mark: leave as-is ("…said “stop.”").
  if (/[.!?]["”’)]$/.test(t)) return capitalize(fixArticles(t));
  const existing = /([.!?])[.!?…]*$/.exec(t);
  const mark = opts.keepMark && existing && existing[1] !== "." ? existing[1] : terminal;
  t = stripTerminal(t);
  return capitalize(fixArticles(t)) + mark;
}

/** A fragment for lists (MVP items): tidy, capitalized, no terminal period. */
export function fragment(text: string): string {
  const t = stripTerminal(tidy(text));
  return t ? capitalize(fixArticles(t)) : "";
}

/** "a", "a and b", "a, b, and c". */
export function joinList(items: readonly string[], conjunction: "and" | "or" = "and"): string {
  const xs = items.map((s) => s.trim()).filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} ${conjunction} ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")}, ${conjunction} ${xs[xs.length - 1]}`;
}

/** Join sentences with single spaces, normalizing each one. */
export function joinSentences(items: readonly string[]): string {
  return items.map((s) => sentence(s, { keepMark: true })).filter(Boolean).join(" ");
}

/** Count sentences (terminal marks followed by whitespace + capital, plus the last one). */
export function countSentences(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const inner = t.match(/[.!?]["”’)]?\s+(?=["“‘(]?[A-Z0-9])/g);
  return (inner ? inner.length : 0) + 1;
}

const CLAUSE_BREAKS = [" — ", " – ", "; ", ": ", ", then ", ", ", " while ", " so ", " until ", " because ", " and "];

/**
 * Keep a sentence within `max` characters by cutting at the latest clause
 * boundary that still leaves a meaningful sentence; word boundary + ellipsis
 * as a last resort.
 */
export function clampSentence(text: string, max: number): string {
  const s = sentence(text, { keepMark: true });
  if (s.length <= max) return s;
  const body = stripTerminal(s);
  let best = -1;
  for (const brk of CLAUSE_BREAKS) {
    let idx = body.lastIndexOf(brk, max - 1);
    while (idx > 0 && idx + 1 > max - 1) idx = body.lastIndexOf(brk, idx - 1);
    if (idx >= Math.min(24, Math.floor(max * 0.35)) && idx > best) best = idx;
  }
  if (best > 0) return sentence(body.slice(0, best));
  const cut = body.lastIndexOf(" ", max - 2);
  const head = stripTerminal(body.slice(0, cut > 0 ? cut : max - 2));
  return `${capitalize(head)}…`;
}

/** Normalized key for de-duplication ("Join a room." ≈ "join a room"). */
export function dedupeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** De-duplicate strings by normalized content, keeping first occurrences. */
export function dedupeText(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = dedupeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Turn a 3rd-person verb phrase into an imperative ("lets a bot nag you" →
 * "Let a bot nag you"). Returns null when the phrase doesn't open with an
 * obvious present-tense verb (e.g. an adverb), so callers can skip it.
 */
export function toImperative(phrase: string): string | null {
  const words = phrase.trim().split(/\s+/);
  const first = words[0]?.toLowerCase() ?? "";
  if (!first || first.endsWith("ly") || !first.endsWith("s") || first.endsWith("ss")) return null;
  const irregular: Record<string, string> = { has: "have", is: "be", does: "do", goes: "go" };
  let base: string;
  if (irregular[first]) base = irregular[first];
  else if (first.endsWith("ies") && first.length > 4) base = `${first.slice(0, -3)}y`;
  else if (/(ss|sh|ch|x|z|o)es$/.test(first)) base = first.slice(0, -2);
  else base = first.slice(0, -1);
  return capitalize([base, ...words.slice(1)].join(" "));
}

/** "study session" → "StudySession". */
export function pascalCase(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Trend angles                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type TrendAngleSource = "trend" | "lexicon" | "generic";

export interface ResolvedTrendAngle {
  /** Template (may contain {placeholders}); fill() it against the idea's DNA. */
  template: string;
  source: TrendAngleSource;
  /** 0–1: how naturally the trend fits into a product. */
  relevance: number;
  /** UPPERCASE words the trend contributes to names. */
  nameWords: string[];
  lexicon?: TrendLexiconEntry;
}

/** Lowercase, diacritic-free, punctuation-free, space-padded — for keyword matching. */
export function normalizeForMatch(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${base} `;
}

/** Best lexicon entry for a trend (keywords in the title beat keywords in tags). */
export function matchTrendLexicon(
  trend: Pick<Trend, "title"> & { tags?: readonly string[] },
  lexicon: readonly TrendLexiconEntry[] = TREND_LEXICON,
): TrendLexiconEntry | undefined {
  const title = normalizeForMatch(trend.title);
  const tags = new Set((trend.tags ?? []).map((t) => normalizeForMatch(t).trim()));
  let best: TrendLexiconEntry | undefined;
  let bestScore = 0;
  for (const entry of lexicon) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = normalizeForMatch(kw).trim();
      if (!k) continue;
      if (title.includes(` ${k} `) || title.includes(` ${k}s `)) score = Math.max(score, 10 + k.length);
      else if (tags.has(k)) score = Math.max(score, 4 + k.length / 4);
    }
    if (score > 0) {
      score += entry.relevance * 5;
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
  }
  return best;
}

const GENERIC_ANGLES: Partial<Record<TrendCategory, readonly string[]>> & { DEFAULT: readonly string[] } = {
  DEFAULT: [
    "borrows the energy of “{trend}” for its launch theme",
    "uses “{trend}” as the in-joke behind its onboarding copy",
    "launches with a limited “{trend}” edition while people still care",
  ],
  AI: [
    "leans on the same models people are poking at through “{trend}”",
    "ships a “{trend}” mode for the early adopters who asked for it",
  ],
  TECH: [
    "ships a “{trend}” mode for the early adopters who asked for it",
    "treats “{trend}” as a feature request instead of a headline",
  ],
  MEME: [
    "borrows the format everyone is copying from “{trend}”",
    "launches with a “{trend}” template people can remix",
  ],
  CULTURE: [
    "borrows the format everyone is copying from “{trend}”",
    "wears the “{trend}” mood without making it the whole point",
  ],
  VIDEO: [
    "turns each result into a short clip in the style of “{trend}”",
    "borrows the format everyone is copying from “{trend}”",
  ],
  MUSIC: [
    "launches with a “{trend}” sound pack for its best moments",
    "borrows the hook-first pacing of “{trend}”",
  ],
  GAMING: [
    "borrows the progression loop people love in “{trend}”",
    "adds a “{trend}” challenge season at launch",
  ],
  SPORTS: [
    "times its first season to the “{trend}” conversation",
    "borrows fantasy-league stakes from “{trend}” without any real money",
  ],
  FINANCE: [
    "turns the “{trend}” conversation into something you can actually track",
    "uses “{trend}” as a reason to finally look at the numbers",
  ],
  LIFESTYLE: [
    "wears the “{trend}” aesthetic without making it the whole point",
    "launches with a “{trend}” challenge week",
  ],
  DESIGN: [
    "wears the “{trend}” aesthetic without making it the whole point",
    "ships a “{trend}” theme as its launch skin",
  ],
};

/**
 * How a trend shows up in the product, as a 3rd-person verb phrase for
 * "It {angle}." Priority: the trend's own `angle` → a lexicon match → a
 * category-flavoured generic line. Pass `dna` to get the filled phrase.
 */
export function resolveTrendAngle(
  trend: Pick<Trend, "title" | "category"> & { angle?: string; tags?: readonly string[]; nameWords?: readonly string[] },
  lexicon: readonly TrendLexiconEntry[] = TREND_LEXICON,
): ResolvedTrendAngle {
  const match = matchTrendLexicon(trend, lexicon);
  const words = (trend.nameWords && trend.nameWords.length > 0 ? trend.nameWords : match?.nameWords) ?? [];
  const nameWords = words.length > 0 ? [...words] : titleNameWords(trend.title);
  const own = trend.angle ? stripTerminal(trend.angle) : "";
  if (own) {
    return { template: own, source: "trend", relevance: match ? Math.max(0.6, match.relevance) : 0.7, nameWords, lexicon: match };
  }
  if (match && stripTerminal(match.angle)) {
    return { template: stripTerminal(match.angle), source: "lexicon", relevance: match.relevance, nameWords, lexicon: match };
  }
  const pool = GENERIC_ANGLES[trend.category] ?? GENERIC_ANGLES.DEFAULT;
  const template = pool[hashString(`angle:${trend.title}`) % pool.length];
  return { template, source: "generic", relevance: 0.3, nameWords };
}

/** Filled trend angle: trendAngle(trend, dna) → "lets a personal AI agent do the nagging for you". */
export function trendAngle(
  trend: Pick<Trend, "title" | "category"> & { angle?: string; tags?: readonly string[] },
  dna?: FillSource,
): string {
  const { template } = resolveTrendAngle(trend);
  const source: FillSource = dna ?? {
    domain: { activity: "", thing: "", things: "", product: "" },
    target: { plural: "", singular: "" },
    trend: { title: trend.title },
  };
  return fill(template, source);
}

const TITLE_STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "into", "about", "what", "when",
  "how", "why", "new", "all", "are", "was", "has", "have", "you", "its", "our", "out", "not",
  "vs", "via", "is", "of", "in", "on", "to", "a", "an", "at", "by", "or",
]);

/** Fallback name words from a trend title: short alphabetic words, uppercased. */
export function titleNameWords(title: string): string[] {
  return normalizeForMatch(title)
    .trim()
    .split(" ")
    .filter((w) => w.length >= 3 && w.length <= 10 && /^[a-z]+$/.test(w) && !TITLE_STOPWORDS.has(w))
    .map((w) => w.toUpperCase())
    .slice(0, 3);
}
