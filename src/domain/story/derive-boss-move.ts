import { seededIndex } from "./seeded-pick";

export type BossMove = Readonly<{
  id:
    | "mirror-mist"
    | "echo-decoy"
    | "shape-shift"
    | "vine-tangle"
    | "starlight-flicker"
    | "tide-pull"
    | "storm-call";
  name: string;
  strategy: string;
  ruleNotice: string;
}>;

const RULE_NOTICE = "只改變故事演出；題目、提示與 XP 規則完全相同。";

// 陣列前 3 個是起始就有的招式；後面的招式依 completedMissionCount 逐步解鎖，
// 讓玩久一點的學生不會一直看到同樣三招，但完全不影響題目／XP 規則。
const moves: ReadonlyArray<BossMove> = [
  {
    id: "mirror-mist",
    name: "鏡像迷霧",
    strategy: "先找題幹中的關鍵詞，再比較看起來很像的兩個選項。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "echo-decoy",
    name: "回聲誘餌",
    strategy: "不要只看第一個熟悉的字，把整個選項讀完再決定。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "shape-shift",
    name: "句型變身",
    strategy: "先確認句子在問什麼，再把學過的規則放進新情境。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "vine-tangle",
    name: "藤蔓纏繞",
    strategy: "先圈出題目要找的重點，再一條一條核對選項。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "starlight-flicker",
    name: "星光閃爍",
    strategy: "別被瞬間的第一印象帶走，把每個選項都看完再比較。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "tide-pull",
    name: "潮汐拉扯",
    strategy: "先確定關鍵字的意思沒變，再檢查整句合不合理。",
    ruleNotice: RULE_NOTICE,
  },
  {
    id: "storm-call",
    name: "風暴召喚",
    strategy: "把題目拆成小段慢慢讀，不用急著一次選完。",
    ruleNotice: RULE_NOTICE,
  },
];

const UNLOCK_TIERS: ReadonlyArray<{ minMissions: number; poolSize: number }> = [
  { minMissions: 0, poolSize: 3 },
  { minMissions: 5, poolSize: 5 },
  { minMissions: 15, poolSize: moves.length },
];

function unlockedPoolSize(completedMissionCount: number): number {
  let poolSize = UNLOCK_TIERS[0].poolSize;
  for (const tier of UNLOCK_TIERS) {
    if (completedMissionCount >= tier.minMissions) poolSize = tier.poolSize;
  }
  return poolSize;
}

export function deriveBossMove(seed: string, completedMissionCount = 0): BossMove {
  const pool = moves.slice(0, unlockedPoolSize(completedMissionCount));
  return pool[seededIndex(seed, pool.length)];
}
