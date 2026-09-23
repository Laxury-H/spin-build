import { TREND_LEXICON } from "@/data/trend-lexicon";
import type { TrendCategory, TrendLexiconEntry } from "@/types";
import { foldText, nameWordsFromTitle, tokenize } from "./text";

const UNSAFE_KEYWORDS = new Set([
  // Violence, tragedy, explicit, sensitive political unrest
  "murder", "killed", "shooting", "dead", "death", "suicide", "tragedy",
  "terror", "terrorist", "massacre", "bomb", "hostage", "war", "invasion",
  "porn", "nsfw", "xxx", "sex", "rape", "nude", "pedophile",
  // Vietnamese folded
  "giet", "chet", "tu-tu", "tai-nan", "tham-sat", "khung-bo", "chien-tranh",
  "dam-o", "hiep-dam", "khieu-dam",
]);

/** Check if a live title contains sensitive, tragic or NSFW keywords. */
export function isUnsafeTrend(title: string): boolean {
  const folded = foldText(title);
  const words = tokenize(folded);
  for (const w of words) {
    if (UNSAFE_KEYWORDS.has(w)) return true;
  }
  return false;
}

export interface ClassifiedTrend {
  category: TrendCategory;
  tags: string[];
  angle: string;
  nameWords: string[];
  relevance: number;
}

/**
 * Match a live trend title against our curated lexicon to determine
 * category, tags, product angle, and application relevance.
 */
export function classifyLiveTitle(title: string, extraTags: string[] = []): ClassifiedTrend {
  const foldedTitle = foldText(title);

  let bestEntry: TrendLexiconEntry | null = null;
  let bestMatchScore = 0;

  for (const entry of TREND_LEXICON) {
    let matches = 0;
    for (const kw of entry.keywords) {
      const foldedKw = foldText(kw);
      if (foldedTitle.includes(foldedKw)) {
        matches += kw.includes(" ") ? 2 : 1;
      }
    }

    if (matches > bestMatchScore) {
      bestMatchScore = matches;
      bestEntry = entry;
    }
  }

  // Combined tags
  const tagsSet = new Set<string>();
  for (const t of extraTags) {
    if (t && t.length >= 2) tagsSet.add(t.toLowerCase());
  }

  if (bestEntry) {
    for (const t of bestEntry.tags) tagsSet.add(t);

    const nameWords = bestEntry.nameWords.length > 0
      ? bestEntry.nameWords
      : nameWordsFromTitle(title, 3);

    return {
      category: bestEntry.category,
      tags: Array.from(tagsSet),
      angle: bestEntry.angle,
      nameWords,
      relevance: bestEntry.relevance,
    };
  }

  // Heuristic category detection if no direct lexicon match
  let category: TrendCategory = "CULTURE";
  if (/\b(ai|llm|gpt|claude|bot|agent|model|machine learning)\b/i.test(title)) {
    category = "AI";
  } else if (/\b(software|code|dev|app|linux|api|database|web|rust|python|git)\b/i.test(title)) {
    category = "TECH";
  } else if (/\b(game|gaming|steam|ps5|nintendo|esports)\b/i.test(title)) {
    category = "GAMING";
  } else if (/\b(music|album|song|singer|band|sound)\b/i.test(title)) {
    category = "MUSIC";
  } else if (/\b(video|movie|trailer|film|cinema|youtube)\b/i.test(title)) {
    category = "VIDEO";
  } else if (/\b(finance|stock|market|crypto|bitcoin|trading|bank|money)\b/i.test(title)) {
    category = "FINANCE";
  } else if (/\b(meme|viral|tiktok|trend|challenge)\b/i.test(title)) {
    category = "MEME";
  }

  const nameWords = nameWordsFromTitle(title, 3);
  if (nameWords.length === 0) {
    nameWords.push("PULSE");
  }

  return {
    category,
    tags: Array.from(tagsSet),
    angle: `taps into the rising interest around ${title.toLowerCase()}`,
    nameWords,
    relevance: 0.65,
  };
}
