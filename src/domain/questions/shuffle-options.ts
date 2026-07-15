/**
 * 選項的可預測洗牌：同一個種子（例如 sessionId:questionId）永遠得到同一種順序，
 * 讓畫面在同一題內不會重排，但跨題／跨學生會不同——避免正解集中在固定位置，
 * 讓學生可以靠「永遠點某個位置」矇對。
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 2_147_483_647;
  }
  return hash;
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffledOptions<Option>(
  question: Readonly<{ id: string; options: readonly Option[] }>,
  seed: string,
): Option[] {
  return seededShuffle(question.options, `${seed}:${question.id}`);
}
