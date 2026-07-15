/**
 * 挑戰競技場計分引擎（純函式）。
 *
 * 定位：這是「遊戲模式」的分數，不是學習評量。競技場為單人對電腦、不排名、
 * 不寫入學習精熟紀錄；核心學習路徑（診斷／任務）仍維持答錯不扣分的白帽原則。
 * 這裡的扣分／保險只是遊戲策略數值。
 */
export type ArenaState = Readonly<{
  score: number;
  streak: number;
  totalCorrect: number;
  insured: boolean;
}>;

export const INITIAL_ARENA: ArenaState = {
  score: 0,
  streak: 0,
  totalCorrect: 0,
  insured: false,
};

export const INSURANCE_COST = 10;
export const MAX_LEVEL = 10;
export const BASE_PENALTY = 3;
export const INSURED_PENALTY = 1;

const TIERS: readonly { threshold: number; name: string }[] = [
  { threshold: 0, name: "見習生" },
  { threshold: 1000, name: "勇者" },
  { threshold: 10000, name: "英雄" },
  { threshold: 100000, name: "大師" },
  { threshold: 1000000, name: "傳說" },
];

/** 連續答對倍率：越連越高，上限 ×10。 */
export function multiplierForStreak(streak: number): number {
  if (streak >= 10) return 10;
  if (streak >= 6) return 5;
  if (streak >= 4) return 3;
  if (streak >= 2) return 2;
  return 1;
}

/** 每答對 5 題升一級，基礎分＝等級（升級後單題基礎分變高）。上限 10 級。 */
export function levelForCorrect(totalCorrect: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(totalCorrect / 5));
}

/** 依累積分數判定階級與下一階門檻。 */
export function tierForScore(score: number): Readonly<{ index: number; name: string; next: number | null }> {
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (score >= TIERS[i].threshold) index = i;
  }
  const next = index + 1 < TIERS.length ? TIERS[index + 1].threshold : null;
  return { index, name: TIERS[index].name, next };
}

/** 答對可得分：基礎分（＝等級）× 連對倍率，用「答對後」的連對數與答對數計算。 */
export function gainForCorrect(state: ArenaState): number {
  const nextStreak = state.streak + 1;
  const level = levelForCorrect(state.totalCorrect + 1);
  return level * multiplierForStreak(nextStreak);
}

/**
 * 答錯扣分：固定小額，不隨分數放大——分數越高的學生不會被扣得更慘，
 * 才不會讓「贏比較多」反而變成「輸得起的風險更高」。有保險則扣更少。
 * 分數不會低於 0。
 */
export function penaltyForWrong(insured: boolean): number {
  return insured ? INSURED_PENALTY : BASE_PENALTY;
}

export type AnswerOutcome = Readonly<{
  state: ArenaState;
  correct: boolean;
  gain: number;
  penalty: number;
}>;

/** 套用一次作答，回傳新狀態與本回合分數變化。保險用一次後即失效。 */
export function applyAnswer(state: ArenaState, correct: boolean): AnswerOutcome {
  if (correct) {
    const gain = gainForCorrect(state);
    return {
      state: {
        score: state.score + gain,
        streak: state.streak + 1,
        totalCorrect: state.totalCorrect + 1,
        insured: false,
      },
      correct: true,
      gain,
      penalty: 0,
    };
  }
  const penalty = Math.min(state.score, penaltyForWrong(state.insured));
  return {
    state: {
      score: Math.max(0, state.score - penalty),
      // 答錯只砍半連對數（無條件捨去），不整串歸零：一次失手不該抹掉先前所有連對的努力。
      streak: Math.floor(state.streak / 2),
      totalCorrect: state.totalCorrect,
      insured: false,
    },
    correct: false,
    gain: 0,
    penalty,
  };
}

const MIN_COMPUTER_ACCURACY = 0.35;
const MAX_COMPUTER_ACCURACY = 0.65;
const COMPUTER_ACCURACY_HANDICAP = 0.05;

/**
 * 電腦對手的命中率會貼著玩家目前的答對率走（略低一點），而不是固定值——
 * 避免電腦在學生程度好的時候太弱沒挑戰性，也避免學生落後時電腦還是遙遙領先、
 * 讓弱勢學生永遠追不上。答題數為 0 時用中間值起手。
 */
export function computerAccuracyFor(playerCorrect: number, playerAnswered: number): number {
  if (playerAnswered <= 0) return 0.5;
  const playerAccuracy = playerCorrect / playerAnswered;
  const target = playerAccuracy - COMPUTER_ACCURACY_HANDICAP;
  return Math.min(MAX_COMPUTER_ACCURACY, Math.max(MIN_COMPUTER_ACCURACY, target));
}

/** 買保險：分數足夠且尚未投保時，扣除成本並標記已投保；否則原樣返回。 */
export function buyInsurance(state: ArenaState): ArenaState {
  if (state.insured || state.score < INSURANCE_COST) {
    return state;
  }
  return { ...state, score: state.score - INSURANCE_COST, insured: true };
}
