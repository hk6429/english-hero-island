import type { VocabPair } from "@/content/vocab-pairs";

/** 洗牌（Fisher–Yates），可注入 rng 以利測試；預設 Math.random（僅瀏覽器端使用）。 */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 從詞庫挑 n 對（不足則全取）。 */
export function pickPairs(
  pairs: readonly VocabPair[],
  count: number,
  rng: () => number = Math.random,
): VocabPair[] {
  return shuffle(pairs, rng).slice(0, Math.min(count, pairs.length));
}

export type MemoryCard = Readonly<{
  id: string;
  key: string;
  kind: "en" | "zh";
  en: string;
  zh: string;
  emoji: string;
}>;

/** 記憶翻牌牌堆：每對拆成一張英文卡＋一張中文卡，洗牌後回傳。 */
export function buildMemoryDeck(
  pairs: readonly VocabPair[],
  rng: () => number = Math.random,
): MemoryCard[] {
  const cards: MemoryCard[] = [];
  for (const pair of pairs) {
    cards.push({ id: `${pair.en}-en`, key: pair.en, kind: "en", en: pair.en, zh: pair.zh, emoji: pair.emoji });
    cards.push({ id: `${pair.en}-zh`, key: pair.en, kind: "zh", en: pair.en, zh: pair.zh, emoji: pair.emoji });
  }
  return shuffle(cards, rng);
}

/** 兩張牌是否配對成功：同一個單字 key、但一張英文一張中文。 */
export function isMemoryMatch(a: MemoryCard, b: MemoryCard): boolean {
  return a.id !== b.id && a.key === b.key && a.kind !== b.kind;
}

export type MatchColumns = Readonly<{
  left: readonly VocabPair[];
  right: readonly VocabPair[];
}>;

/** 連連看：左欄英文、右欄中文，兩欄各自獨立洗牌。 */
export function buildMatchColumns(
  pairs: readonly VocabPair[],
  rng: () => number = Math.random,
): MatchColumns {
  return {
    left: shuffle(pairs, rng),
    right: shuffle(pairs, rng),
  };
}
