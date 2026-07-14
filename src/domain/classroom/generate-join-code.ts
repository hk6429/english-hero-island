const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

type FillRandom = (bytes: Uint8Array) => Uint8Array;

export function generateJoinCode(
  fillRandom: FillRandom = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = fillRandom(new Uint8Array(6));
  return Array.from(bytes, (value) => JOIN_CODE_ALPHABET[value % JOIN_CODE_ALPHABET.length]).join("");
}
