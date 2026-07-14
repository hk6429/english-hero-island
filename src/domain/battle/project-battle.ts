import type { LearningEvent } from "../learning/types";

export type BattleState = Readonly<{
  armor: number;
  shields: number;
  combo: number;
  rescueActive: boolean;
}>;

export type BattleAction =
  | "critical_hit"
  | "standard_hit"
  | "partner_hit"
  | "enemy_counter";

export type BattleProjection = BattleState & Readonly<{ action: BattleAction }>;

export function projectBattle(
  state: BattleState,
  event: LearningEvent,
): BattleProjection {
  if (event.outcome === "independent_correct") {
    return {
      ...state,
      armor: Math.max(0, state.armor - 1),
      combo: Math.min(3, state.combo + 1),
      action: "critical_hit",
    };
  }

  if (event.outcome === "pending_support") {
    const shields = Math.max(0, state.shields - 1);
    return {
      ...state,
      shields,
      combo: 0,
      rescueActive: shields === 0,
      action: "enemy_counter",
    };
  }

  if (event.outcome === "assisted_correct") {
    return {
      ...state,
      armor: Math.max(0, state.armor - 1),
      combo: 0,
      action: "standard_hit",
    };
  }

  if (event.outcome === "rescued") {
    return {
      ...state,
      armor: Math.max(0, state.armor - 1),
      combo: 0,
      rescueActive: false,
      action: "partner_hit",
    };
  }

  return { ...state, action: "enemy_counter" };
}
