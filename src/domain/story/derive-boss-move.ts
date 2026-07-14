export type BossMove = Readonly<{
  id: "mirror-mist" | "echo-decoy" | "shape-shift";
  name: string;
  strategy: string;
  ruleNotice: string;
}>;

const moves: ReadonlyArray<BossMove> = [
  {
    id: "mirror-mist",
    name: "鏡像迷霧",
    strategy: "先找題幹中的關鍵詞，再比較看起來很像的兩個選項。",
    ruleNotice: "只改變故事演出；題目、提示與 XP 規則完全相同。",
  },
  {
    id: "echo-decoy",
    name: "回聲誘餌",
    strategy: "不要只看第一個熟悉的字，把整個選項讀完再決定。",
    ruleNotice: "只改變故事演出；題目、提示與 XP 規則完全相同。",
  },
  {
    id: "shape-shift",
    name: "句型變身",
    strategy: "先確認句子在問什麼，再把學過的規則放進新情境。",
    ruleNotice: "只改變故事演出；題目、提示與 XP 規則完全相同。",
  },
];

export function deriveBossMove(seed: string): BossMove {
  const index = Array.from(seed).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % moves.length;
  return moves[index];
}
