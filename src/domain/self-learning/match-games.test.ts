import { describe, expect, it } from "vitest";
import type { VocabPair } from "@/content/vocab-pairs";
import {
  buildMatchColumns,
  buildMemoryDeck,
  isMemoryMatch,
  pickPairs,
  shuffle,
} from "./match-games";

const pairs: VocabPair[] = [
  { en: "cat", zh: "貓", emoji: "🐱", grade: 3 },
  { en: "dog", zh: "狗", emoji: "🐶", grade: 3 },
  { en: "pig", zh: "豬", emoji: "🐷", grade: 3 },
];

// 固定序列 rng（0）→ Fisher–Yates 完全反轉，方便斷言
const zeroRng = () => 0;

describe("match games", () => {
  it("shuffle keeps every element (permutation), does not mutate input", () => {
    const input = [1, 2, 3, 4];
    const out = shuffle(input, zeroRng);
    expect([...out].sort()).toEqual([1, 2, 3, 4]);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it("pickPairs returns at most count pairs, never more than available", () => {
    expect(pickPairs(pairs, 2, zeroRng)).toHaveLength(2);
    expect(pickPairs(pairs, 10, zeroRng)).toHaveLength(3);
  });

  it("memory deck has two cards per pair (one en, one zh) with equal counts", () => {
    const deck = buildMemoryDeck(pairs, zeroRng);
    expect(deck).toHaveLength(6);
    expect(deck.filter((c) => c.kind === "en")).toHaveLength(3);
    expect(deck.filter((c) => c.kind === "zh")).toHaveLength(3);
    expect(new Set(deck.map((c) => c.id)).size).toBe(6);
  });

  it("matches an en card with its zh partner only", () => {
    const deck = buildMemoryDeck(pairs, zeroRng);
    const catEn = deck.find((c) => c.id === "cat-en")!;
    const catZh = deck.find((c) => c.id === "cat-zh")!;
    const dogZh = deck.find((c) => c.id === "dog-zh")!;
    expect(isMemoryMatch(catEn, catZh)).toBe(true);
    expect(isMemoryMatch(catEn, dogZh)).toBe(false);
    expect(isMemoryMatch(catEn, catEn)).toBe(false);
  });

  it("match columns keep the same pair set on both sides", () => {
    const { left, right } = buildMatchColumns(pairs, zeroRng);
    expect(left.map((p) => p.en).sort()).toEqual(["cat", "dog", "pig"]);
    expect(right.map((p) => p.en).sort()).toEqual(["cat", "dog", "pig"]);
  });
});
