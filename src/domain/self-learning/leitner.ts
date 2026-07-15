/**
 * Leitner 五盒間隔複習：純函式，無副作用，供閃卡自學使用。
 * 盒號 1（最生疏，最常複習）到 5（最熟）。答「會」升一盒、答「不會」退回第一盒。
 */
export const LEITNER_MIN_BOX = 1;
export const LEITNER_MAX_BOX = 5;

export type BoxMap = Readonly<Record<string, number>>;

/** 答對升一盒（上限 5），答錯退回第一盒。 */
export function promoteBox(box: number, known: boolean): number {
  if (!known) {
    return LEITNER_MIN_BOX;
  }
  return Math.min(LEITNER_MAX_BOX, box + 1);
}

/** 建立初始盒表：每個 key 都放在第一盒。 */
export function initBoxes(keys: readonly string[]): BoxMap {
  const map: Record<string, number> = {};
  for (const key of keys) {
    map[key] = LEITNER_MIN_BOX;
  }
  return map;
}

/** 套用一次作答，回傳新的盒表（不改動原物件）。 */
export function applyAnswer(boxes: BoxMap, key: string, known: boolean): BoxMap {
  const current = boxes[key] ?? LEITNER_MIN_BOX;
  return { ...boxes, [key]: promoteBox(current, known) };
}

/**
 * 複習順序：盒號小的先複習（越生疏越優先）；同盒維持傳入 keys 的原順序（穩定）。
 * 傳入 keys 決定候選集合，boxes 缺項視為第一盒。
 */
export function dueOrder(keys: readonly string[], boxes: BoxMap): string[] {
  return keys
    .map((key, index) => ({ key, index, box: boxes[key] ?? LEITNER_MIN_BOX }))
    .sort((a, b) => (a.box === b.box ? a.index - b.index : a.box - b.box))
    .map((entry) => entry.key);
}

/** 全部進到最後一盒即視為此年級精熟完成。 */
export function isAllMastered(keys: readonly string[], boxes: BoxMap): boolean {
  return keys.length > 0 && keys.every((key) => (boxes[key] ?? LEITNER_MIN_BOX) === LEITNER_MAX_BOX);
}
