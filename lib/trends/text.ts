/**
 * Text utilities for live trend titles. Pure and browser-safe.
 *
 * Live titles arrive noisy ("🔥 MINECRAFT MOVIE | Official Trailer #shorts",
 * "Show HN: Drop – A rootless Linux sandbox (2024)", "kết quả xổ số"). Everything
 * here turns them into short, display-ready noun phrases and stable ids, and
 * provides the Vietnamese-aware folding used by the lexicon and the merger.
 */
import type { TrendSourceId } from "@/types";
import { hashString } from "@/lib/random";

/** Hard cap for `Trend.title` (see types/index.ts). */
export const MAX_TITLE_LENGTH = 60;

/* ────────────────────────────────────────────────────────────────────────── */
/* Folding + tokens                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

const COMBINING_MARKS = /[̀-ͯ]/g;
const LETTER_OR_DIGIT_RUN = /[\p{L}\p{N}]+/gu;

/** Strip diacritics (Vietnamese-aware: đ → d, Đ → D). "Kết quả xổ số" → "Ket qua xo so". */
export function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFC");
}

/** Lowercase + diacritics stripped. Used for accent-insensitive matching. */
export function foldText(input: string): string {
  return stripDiacritics(input.normalize("NFC")).toLowerCase();
}

/** True when the text contains any non-ASCII letter (e.g. Vietnamese diacritics). */
export function hasDiacritics(input: string): boolean {
  return input !== stripDiacritics(input);
}

/** Word tokens (letters/digits runs). Keeps diacritics; lowercases. */
export function tokenize(input: string): string[] {
  return input.normalize("NFC").toLowerCase().match(LETTER_OR_DIGIT_RUN) ?? [];
}

/** URL-safe slug, Vietnamese-aware. "Kết quả xổ số!" → "ket-qua-xo-so". */
export function slugify(input: string, maxLength = 64): string {
  const slug = foldText(input)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > maxLength / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/** Stable trend id `${source}:${slug}`; titles that fold to nothing get a hash slug. */
export function trendId(source: TrendSourceId, title: string): string {
  const slug = slugify(title);
  return `${source}:${slug || `t${hashString(title.normalize("NFC")).toString(36)}`}`;
}

/** kebab-case tag, or null when the input can't make a useful tag. */
export function toTag(input: string): string | null {
  const tag = slugify(input, 32);
  if (tag.length < 2 || /^\d+$/.test(tag)) return null;
  return tag;
}

const STOPWORDS = new Set([
  // English
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "at", "for", "with", "by", "from",
  "as", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these", "those",
  "vs", "via", "into", "over", "about", "after", "before", "how", "why", "what", "when", "who",
  "your", "you", "my", "our", "their", "his", "her", "i", "we", "they", "he", "she", "not", "no",
  "new", "just", "now", "more", "most", "can", "will", "has", "have", "had", "do", "does", "did",
  "than", "then", "so", "if", "up", "out", "all", "any", "some", "one", "two", "get", "got",
  "show", "hn", "ask", "launch", "tell",
  // Vietnamese (folded)
  "va", "voi", "cua", "cho", "la", "cac", "nhung", "mot", "nay", "khi", "thi", "tai", "trong",
  "tren", "duoc", "bi", "da", "dang", "se", "co", "khong", "ve", "tu", "den", "ra", "vao",
]);

/** Significant folded tokens for similarity: no stopwords, crude singularization. */
export function significantTokens(input: string): string[] {
  const out: string[] = [];
  for (const raw of foldText(input).match(/[a-z0-9]+/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    if (raw.length < 2 && !/^\d$/.test(raw)) continue;
    const token = raw.length > 4 && raw.endsWith("s") && !raw.endsWith("ss") ? raw.slice(0, -1) : raw;
    if (!out.includes(token)) out.push(token);
  }
  return out;
}

export function isStopword(foldedToken: string): boolean {
  return STOPWORDS.has(foldedToken);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Title cleaning                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍︎️⃣]/gu;
const CONTROL = /[\u0000-\u001F\u007F-\u009F​‌⁠﻿]/g;
const HASHTAG = /(^|\s)#[\p{L}\p{N}_]+/gu;
const MENTION = /(^|\s)@[\p{L}\p{N}_.]+/gu;
const BRACKETED = /\s*(?:\([^()]*\)|\[[^\[\]]*\]|【[^【】]*】|「[^「」]*」|『[^『』]*』|〔[^〔〕]*〕|\{[^{}]*\})\s*/g;
const HN_PREFIX = /^(?:show|ask|launch|tell)\s+hn\s*[:\-–—]\s*/i;
const SEGMENT_SPLIT = /\s+(?:\|{1,2}|•|‧|·|\/\/|｜)\s+/;

/** Segments that carry no topic ("Official Trailer", "MV", "4K", "Tập 12", "- YouTube"). */
const JUNK_SEGMENT = new RegExp(
  [
    "^(?:",
    [
      "official(?:\\s+(?:music|lyrics?|dance|performance))?(?:\\s+(?:video|trailer|teaser|audio|mv|clip|visuali[sz]er))?",
      "(?:music|lyrics?|dance|performance)\\s+video",
      "(?:official\\s+)?(?:trailer|teaser)(?:\\s+\\d+)?",
      "m\\s*\\/\\s*v|mv|pv|audio|visuali[sz]er|lyrics?|full(?:\\s+(?:movie|episode|album|hd|version))?",
      "(?:4|8)k(?:\\s+hdr)?|hd|uhd|hdr|remastered|shorts?|live|livestream|premiere|reaction|highlights?",
      "(?:ep|episode|tap|part|pt)\\.?\\s*\\d+",
      "youtube|tiktok|reels?|vevo|topic|subscribe(?:\\s+now)?",
    ].join("|"),
    ")$",
  ].join(""),
  "i",
);

const TRAILING_JUNK =
  /(?:\s*[-–—|:,]\s*|\s+)(?:official\s+)?(?:music\s+video|lyrics?\s+video|official\s+(?:video|trailer|teaser|audio|mv)|trailer|teaser|m\s*\/\s*v|mv|visuali[sz]er|full\s+(?:movie|episode|album)|youtube)\s*$/i;

const EDGE_PUNCT = /^[\s\-–—|:;,.·•~_*"'“”‘’`«»]+|[\s\-–—|:;,·•~_*"'“”‘’`«»]+$/g;

/** Remove emoji, hashtags, @mentions and control chars; collapse whitespace. */
export function stripNoise(input: string): string {
  return input
    .normalize("NFC")
    .replace(CONTROL, " ")
    .replace(EMOJI, " ")
    .replace(HASHTAG, " ")
    .replace(MENTION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isJunkSegment(segment: string): boolean {
  const s = foldText(segment).replace(EDGE_PUNCT, "").trim();
  return s.length === 0 || JUNK_SEGMENT.test(s);
}

function letterStats(input: string): { letters: number; upper: number } {
  let letters = 0;
  let upper = 0;
  for (const ch of input) {
    const lower = ch.toLowerCase();
    const up = ch.toUpperCase();
    if (lower === up) continue; // not a cased letter
    letters++;
    if (ch === up) upper++;
  }
  return { letters, upper };
}

/** True for titles written in all caps ("MINECRAFT MOVIE", "CHÚNG TA CỦA TƯƠNG LAI"). */
export function isShouting(input: string): boolean {
  const { letters, upper } = letterStats(input);
  return letters >= 6 && upper / letters >= 0.75;
}

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to",
  "vs", "via", "with", "x",
]);
const VOWELS = /[aeiouy]/;

function caseWord(word: string, first: boolean): string {
  // Preserve hyphenated parts individually: "m-tp" → "M-TP", "u-23" → "U-23".
  return word
    .split("-")
    .map((part, i) => {
      if (!part) return part;
      const folded = foldText(part);
      if (/\d/.test(part)) return part.toUpperCase();
      if (!first && i === 0 && SMALL_WORDS.has(folded)) return part.toLowerCase();
      if (/^[a-z]+$/.test(folded) && folded.length <= 4 && !VOWELS.test(folded)) return part.toUpperCase();
      if (folded.length === 1 && !(first && i === 0)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("-");
}

/**
 * Title-case a lowercase search query or a shouted title. Vowel-less short tokens are treated as
 * acronyms ("psg" → "PSG", "gpt" → "GPT"); small words stay lowercase ("Real Madrid vs PSG").
 */
export function smartTitleCase(input: string): string {
  const words = input.trim().split(/\s+/);
  return words.map((w, i) => caseWord(w, i === 0)).join(" ");
}

/** Shorten to ≤ max chars at a natural boundary. Never adds an ellipsis (titles are noun phrases). */
export function shortenTitle(input: string, max = MAX_TITLE_LENGTH): string {
  const title = input.trim();
  if (title.length <= max) return title;

  // 1) Prefer the head of a "Head: tail" / "Head – tail" / "Head, tail" / "Head? tail" shape.
  const boundary = /(?::\s|\s[-–—]\s|,\s|\?\s|;\s|\.\s)/g;
  let best = "";
  for (const m of title.matchAll(boundary)) {
    const end = (m.index ?? 0) + (m[0].startsWith("?") ? 1 : 0);
    const head = title.slice(0, end).trim();
    if (head.length >= 12 && head.length <= max && head.length > best.length) best = head;
  }
  if (best) return best.replace(EDGE_PUNCT, "");

  // 2) Word-boundary cut, dropping dangling stopwords ("…of the").
  const words = title.split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    const next = kept.length ? `${kept.join(" ")} ${w}` : w;
    if (next.length > max) break;
    kept.push(w);
  }
  while (kept.length > 1 && isStopword(foldText(kept[kept.length - 1]).replace(/[^a-z0-9]/g, ""))) kept.pop();
  const cut = kept.join(" ").replace(EDGE_PUNCT, "");
  return cut.length > 0 ? cut : title.slice(0, max).trim();
}

export interface CleanTitleOptions {
  /** Title-case the result (search queries, GIF terms arrive lowercase). */
  titleCase?: boolean;
  /** Strip "Show HN:"-style prefixes. */
  hackerNews?: boolean;
}

/**
 * Turn a raw live title into a display title ≤ 60 chars. Removes emoji, hashtags, bracketed
 * asides, junk segments ("| Official Trailer", " - YouTube"), de-shouts ALL CAPS, and shortens at
 * a natural boundary. Returns "" when nothing meaningful is left.
 */
export function cleanTitle(raw: string, opts: CleanTitleOptions = {}): string {
  let title = stripNoise(raw);
  if (opts.hackerNews) title = title.replace(HN_PREFIX, "");

  const unbracketed = title.replace(BRACKETED, " ").replace(/\s+/g, " ").trim();
  if (unbracketed.replace(EDGE_PUNCT, "").length >= 2) title = unbracketed;

  // Split on strong separators; keep meaningful segments (at most two, if the head is short).
  const segments = title
    .split(SEGMENT_SPLIT)
    .map((s) => s.replace(EDGE_PUNCT, "").trim())
    .filter((s) => s.length > 0 && !isJunkSegment(s));
  if (segments.length > 0) {
    const [head, second] = segments;
    const headWords = head.split(/\s+/).length;
    title = second && headWords <= 3 && head.length + second.length + 3 <= MAX_TITLE_LENGTH ? `${head} – ${second}` : head;
  }

  // Trailing junk without a strong separator ("Taylor Swift - Opalite Official Music Video").
  for (let i = 0; i < 3; i++) {
    const next = title.replace(TRAILING_JUNK, "").trim();
    if (next === title || next.length < 2) break;
    title = next;
  }

  title = title.replace(/\s+/g, " ").replace(EDGE_PUNCT, "").trim();
  if (isShouting(title) || opts.titleCase) title = smartTitleCase(opts.titleCase ? title.toLowerCase() : title);
  title = shortenTitle(title, MAX_TITLE_LENGTH);
  return title.replace(/\s+/g, " ").trim();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Name words                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

const NAME_WORD = /^[A-Z0-9][A-Z0-9'&.\-]*$/;
const NAME_BLOCKLIST = new Set(["THE", "AND", "FOR", "WITH", "FROM", "THIS", "THAT", "YOUR", "WHY", "HOW", "WHAT", "OFFICIAL", "VIDEO", "TRAILER"]);

/** Up to `max` UPPERCASE single words from a title, ASCII-folded ("Chúng ta" → "CHUNG"). */
export function nameWordsFromTitle(title: string, max = 3): string[] {
  const out: string[] = [];
  for (const token of foldText(title).match(/[a-z0-9]+/g) ?? []) {
    if (token.length < 3 || token.length > 12 || /^\d+$/.test(token) || isStopword(token)) continue;
    const word = token.toUpperCase();
    if (!NAME_WORD.test(word) || NAME_BLOCKLIST.has(word) || out.includes(word)) continue;
    out.push(word);
    if (out.length >= max) break;
  }
  return out;
}

/** True when `word` is a valid UPPERCASE name word (matches the dataset rule). */
export function isNameWord(word: string): boolean {
  return NAME_WORD.test(word);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* XML entities (RSS)                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/** Decode XML/HTML character references. Unknown named entities are kept verbatim. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Only http(s) URLs survive (no `javascript:` or data URLs reach the UI). */
export function safeHttpUrl(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
