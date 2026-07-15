import { describe, expect, it } from "vitest";
import {
  applyRound,
  classProgress,
  ENERGY_PER_CORRECT,
  energyForRound,
  initClassBattle,
  participation,
  type RoundSubmission,
} from "./cooperative";

const round: RoundSubmission[] = [
  { correct: true },
  { correct: false },
  { correct: true },
  { correct: true },
];

describe("initClassBattle", () => {
  it("starts with zero energy and not cleared", () => {
    expect(initClassBattle(100)).toEqual({ energy: 0, target: 100, cleared: false });
  });

  it("rejects a non-positive target", () => {
    expect(() => initClassBattle(0)).toThrow();
    expect(() => initClassBattle(-5)).toThrow();
  });
});

describe("energyForRound", () => {
  it("counts only correct answers", () => {
    expect(energyForRound(round)).toBe(3 * ENERGY_PER_CORRECT);
    expect(energyForRound([])).toBe(0);
  });
});

describe("applyRound", () => {
  it("accumulates energy across rounds", () => {
    const state = applyRound(initClassBattle(100), round);
    expect(state.energy).toBe(30);
    expect(state.cleared).toBe(false);
  });

  it("caps energy at the target and marks cleared", () => {
    const state = applyRound(initClassBattle(20), round);
    expect(state.energy).toBe(20);
    expect(state.cleared).toBe(true);
  });
});

describe("classProgress", () => {
  it("reports collective progress as a bounded percentage", () => {
    expect(classProgress({ energy: 0, target: 100, cleared: false })).toBe(0);
    expect(classProgress({ energy: 30, target: 100, cleared: false })).toBe(30);
    expect(classProgress({ energy: 100, target: 100, cleared: true })).toBe(100);
    expect(classProgress({ energy: 150, target: 100, cleared: true })).toBe(100);
  });
});

describe("participation", () => {
  it("counts everyone who answered, without ranking them", () => {
    expect(participation(round)).toBe(4);
  });
});
