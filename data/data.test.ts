/**
 * Dataset invariants. Run: npx vitest run data
 * Each dataset author must keep their file green.
 */
import { describe, expect, it } from "vitest";
import type { DatasetEntry } from "@/types";
import { CHAOS_MILD } from "./chaos-mild";
import { CHAOS_WILD } from "./chaos-wild";
import { CONSTRAINTS } from "./constraints";
import { DOMAINS } from "./domains";
import { MECHANICS } from "./mechanics";
import { SECTORS } from "./sectors";
import { TARGETS } from "./targets";
import { TREND_LEXICON } from "./trend-lexicon";
import { FALLBACK_TRENDS } from "./trends-fallback";

const PLACEHOLDERS = new Set(["users", "user", "activity", "thing", "things", "product", "trend"]);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UPPER_WORD = /^[A-Z0-9][A-Z0-9'&.\-]*$/;

function placeholdersIn(s: string): string[] {
  return [...s.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]);
}

function expectValidTemplates(strings: string[], where: string) {
  for (const s of strings) {
    for (const p of placeholdersIn(s)) {
      expect(PLACEHOLDERS.has(p), `${where}: unknown placeholder {${p}} in "${s}"`).toBe(true);
    }
    expect(s.trim(), `${where}: untrimmed "${s}"`).toBe(s);
    expect(s.length, `${where}: empty string`).toBeGreaterThan(0);
  }
}

function expectEntries(name: string, items: DatasetEntry[], min: number) {
  it(`${name}: has ≥ ${min} entries`, () => {
    expect(items.length).toBeGreaterThanOrEqual(min);
  });
  it(`${name}: ids are unique kebab-case`, () => {
    const ids = items.map((i) => i.id);
    for (const id of ids) expect(KEBAB.test(id), `${name}: bad id "${id}"`).toBe(true);
    expect(new Set(ids).size, `${name}: duplicate ids`).toBe(ids.length);
  });
  it(`${name}: weirdness 0–100, tags kebab-case, weight sane`, () => {
    for (const i of items) {
      expect(i.weirdness, `${name}/${i.id}`).toBeGreaterThanOrEqual(0);
      expect(i.weirdness, `${name}/${i.id}`).toBeLessThanOrEqual(100);
      expect(i.tags.length, `${name}/${i.id}: needs tags`).toBeGreaterThan(0);
      for (const t of i.tags) expect(KEBAB.test(t), `${name}/${i.id}: bad tag "${t}"`).toBe(true);
      if (i.weight !== undefined) {
        expect(i.weight).toBeGreaterThan(0);
        expect(i.weight).toBeLessThanOrEqual(3);
      }
    }
  });
  it(`${name}: spans the chaos scale`, () => {
    if (items.length === 0) return;
    const w = items.map((i) => i.weirdness);
    expect(Math.max(...w) - Math.min(...w)).toBeGreaterThanOrEqual(40);
  });
}

function expectShort(name: string, items: { id: string; short: string }[]) {
  it(`${name}: short labels are UPPERCASE and ≤ 18 chars`, () => {
    for (const i of items) {
      expect(i.short, `${name}/${i.id}`).toBe(i.short.toUpperCase());
      expect(i.short.length, `${name}/${i.id}: "${i.short}"`).toBeLessThanOrEqual(18);
    }
  });
}

function expectNameWords(name: string, items: { id: string; nameWords: string[] }[], min: number) {
  it(`${name}: nameWords are UPPERCASE single words (≥ ${min})`, () => {
    for (const i of items) {
      expect(i.nameWords.length, `${name}/${i.id}`).toBeGreaterThanOrEqual(min);
      for (const w of i.nameWords) expect(UPPER_WORD.test(w), `${name}/${i.id}: "${w}"`).toBe(true);
    }
  });
}

describe("domains", () => {
  expectEntries("domains", DOMAINS, 30);
  expectShort("domains", DOMAINS);
  expectNameWords("domains", DOMAINS, 4);
  it("every wheel sector has at least one domain", () => {
    for (const s of SECTORS) {
      expect(DOMAINS.some((d) => d.sector === s.id), `sector ${s.id} has no domain`).toBe(true);
    }
  });
  it("domain fields are well-formed", () => {
    for (const d of DOMAINS) {
      expect(d.activity).toBe(d.activity.toLowerCase());
      expect(d.activity.endsWith("ing") || d.activity.includes("ing "), `${d.id}: activity must be a gerund`).toBe(true);
      expect(d.problems.length, d.id).toBeGreaterThanOrEqual(3);
      expectValidTemplates(d.problems, `domain/${d.id}.problems`);
      expect(d.product).toBe(d.product.toLowerCase());
    }
  });
});

describe("targets", () => {
  expectEntries("targets", TARGETS, 40);
  expectShort("targets", TARGETS);
  expectNameWords("targets", TARGETS, 2);
  it("target fields are well-formed", () => {
    for (const t of TARGETS) {
      expect(/^(a|an) /.test(t.singular), `${t.id}: singular needs an article`).toBe(true);
      expect(t.pains.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.motivations.length, t.id).toBeGreaterThanOrEqual(2);
      expectValidTemplates(t.pains, `target/${t.id}.pains`);
    }
  });
});

describe("mechanics", () => {
  expectEntries("mechanics", MECHANICS, 40);
  expectShort("mechanics", MECHANICS);
  expectNameWords("mechanics", MECHANICS, 2);
  it("mechanic fields are well-formed", () => {
    for (const m of MECHANICS) {
      expect(m.adjective).toBe(m.adjective.toLowerCase());
      expect(m.loop.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.mvp.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.stack.length, m.id).toBeGreaterThanOrEqual(1);
      expectValidTemplates([m.verb, m.hook, ...m.loop, ...m.mvp], `mechanic/${m.id}`);
      expect([1, 2, 3, 4, 5]).toContain(m.complexity);
    }
  });
});

describe("constraints", () => {
  expectEntries("constraints", CONSTRAINTS, 60);
  expectShort("constraints", CONSTRAINTS);
  it("constraint fields are well-formed", () => {
    for (const c of CONSTRAINTS) {
      expect(c.text.endsWith("."), `${c.id}: text is a sentence`).toBe(true);
      expect(c.effort).toBeGreaterThanOrEqual(-2);
      expect(c.effort).toBeLessThanOrEqual(3);
      expectValidTemplates([c.implication], `constraint/${c.id}`);
    }
  });
});

describe("chaos modifiers", () => {
  const all = [...CHAOS_MILD, ...CHAOS_WILD];
  expectEntries("chaos-mild", CHAOS_MILD, 50);
  expectEntries("chaos-wild", CHAOS_WILD, 50);
  expectShort("chaos", all);
  expectNameWords("chaos", all, 1);
  it("≥ 100 modifiers with unique ids across both files", () => {
    expect(all.length).toBeGreaterThanOrEqual(100);
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size, "duplicate ids across chaos-mild/chaos-wild").toBe(ids.length);
  });
  it("clauses start with a connective and templates are valid", () => {
    for (const c of all) {
      expect(/^(where|that|but|and|which|until|so|while|because|unless|as long as) /.test(c.clause), `${c.id}: "${c.clause}"`).toBe(true);
      expect(c.text.endsWith(".") || c.text.endsWith("!"), `${c.id}: text is a sentence`).toBe(true);
      expect(c.viral).toBeGreaterThanOrEqual(0);
      expect(c.viral).toBeLessThanOrEqual(100);
      expectValidTemplates([c.clause, c.twist, c.hook, c.mvp], `chaos/${c.id}`);
    }
  });
  it("mild spans low chaos, wild spans high chaos", () => {
    if (CHAOS_MILD.length) expect(Math.min(...CHAOS_MILD.map((c) => c.weirdness))).toBeLessThanOrEqual(15);
    if (CHAOS_WILD.length) expect(Math.max(...CHAOS_WILD.map((c) => c.weirdness))).toBeGreaterThanOrEqual(90);
  });
});

describe("fallback trends", () => {
  it("≥ 50 trends, unique curated ids, GLOBAL + VN coverage", () => {
    expect(FALLBACK_TRENDS.length).toBeGreaterThanOrEqual(50);
    const ids = FALLBACK_TRENDS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of FALLBACK_TRENDS) {
      expect(t.id.startsWith("curated:"), t.id).toBe(true);
      expect(t.source).toBe("curated");
      expect(t.title.length).toBeLessThanOrEqual(60);
      expect(t.score).toBeGreaterThanOrEqual(0);
      expect(t.score).toBeLessThanOrEqual(100);
      expect(t.angle, `${t.id}: curated trends need an angle`).toBeTruthy();
    }
    expect(FALLBACK_TRENDS.filter((t) => t.region === "VN").length).toBeGreaterThanOrEqual(12);
    expect(FALLBACK_TRENDS.filter((t) => t.region === "GLOBAL").length).toBeGreaterThanOrEqual(38);
  });
  it("lexicon entries are well-formed", () => {
    expect(TREND_LEXICON.length).toBeGreaterThanOrEqual(30);
    for (const l of TREND_LEXICON) {
      expect(l.keywords.length, l.id).toBeGreaterThan(0);
      for (const k of l.keywords) expect(k).toBe(k.toLowerCase());
      expect(l.relevance).toBeGreaterThanOrEqual(0);
      expect(l.relevance).toBeLessThanOrEqual(1);
      expectValidTemplates([l.angle], `lexicon/${l.id}`);
    }
  });
});
