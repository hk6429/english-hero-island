export function seededIndex(seed: string, size: number): number {
  if (size <= 0) return 0;

  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 2_147_483_647;
  }

  return hash % size;
}
