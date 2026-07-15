/**
 * 全班協力對戰的純計分邏輯。
 *
 * 白帽設計：全班「合作」把一個共同關卡的能量填滿，而不是互相排名。
 * 這裡刻意不提供任何「依個人分數排序」的函式——輸出只有全班的集體進度與
 * 參與人數，不揭露也不比較個別學生成績。真人即時同步由 realtime-port 負責，
 * 在後端連上之前一律 fail-closed，不會捏造任何作答資料。
 */
export const ENERGY_PER_CORRECT = 10;

export type ClassBattleState = Readonly<{
  energy: number;
  target: number;
  cleared: boolean;
}>;

/** 一位學生在某一回合的作答結果（匿名，不帶可排名的身分）。 */
export type RoundSubmission = Readonly<{ correct: boolean }>;

export function initClassBattle(target: number): ClassBattleState {
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error("班級關卡能量目標必須是正整數");
  }
  return { energy: 0, target, cleared: false };
}

/** 這一回合全班答對累積的能量。 */
export function energyForRound(submissions: readonly RoundSubmission[]): number {
  return submissions.filter((submission) => submission.correct).length * ENERGY_PER_CORRECT;
}

/** 把一回合的作答併入全班能量，能量封頂於目標，達標即通關。 */
export function applyRound(
  state: ClassBattleState,
  submissions: readonly RoundSubmission[],
): ClassBattleState {
  const energy = Math.min(state.target, state.energy + energyForRound(submissions));
  return { ...state, energy, cleared: energy >= state.target };
}

/** 全班集體進度（0–100 的整數百分比），供進度條顯示，不含個人資料。 */
export function classProgress(state: ClassBattleState): number {
  return Math.min(100, Math.round((state.energy / state.target) * 100));
}

/** 這一回合有多少人參與作答（鼓勵參與，不做名次）。 */
export function participation(submissions: readonly RoundSubmission[]): number {
  return submissions.length;
}
