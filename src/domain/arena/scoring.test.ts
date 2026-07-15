import { describe, expect, it } from "vitest";
import {
  INITIAL_ARENA,
  INSURANCE_COST,
  applyAnswer,
  buyInsurance,
  computerAccuracyFor,
  gainForCorrect,
  levelForCorrect,
  multiplierForStreak,
  penaltyForWrong,
  tierForScore,
} from "./scoring";

describe("multiplierForStreak", () => {
  it("climbs with the streak and caps at ten", () => {
    expect(multiplierForStreak(0)).toBe(1);
    expect(multiplierForStreak(1)).toBe(1);
    expect(multiplierForStreak(2)).toBe(2);
    expect(multiplierForStreak(4)).toBe(3);
    expect(multiplierForStreak(6)).toBe(5);
    expect(multiplierForStreak(10)).toBe(10);
    expect(multiplierForStreak(99)).toBe(10);
  });
});

describe("levelForCorrect", () => {
  it("gains a level every five correct answers, capped at ten", () => {
    expect(levelForCorrect(0)).toBe(1);
    expect(levelForCorrect(4)).toBe(1);
    expect(levelForCorrect(5)).toBe(2);
    expect(levelForCorrect(45)).toBe(10);
    expect(levelForCorrect(200)).toBe(10);
  });
});

describe("tierForScore", () => {
  it("promotes across the 1000/10000/100000/1000000 thresholds", () => {
    expect(tierForScore(0)).toMatchObject({ index: 0, name: "見習生", next: 1000 });
    expect(tierForScore(1000)).toMatchObject({ index: 1, name: "勇者", next: 10000 });
    expect(tierForScore(10000)).toMatchObject({ index: 2, name: "英雄" });
    expect(tierForScore(100000)).toMatchObject({ index: 3, name: "大師" });
    expect(tierForScore(1000000)).toMatchObject({ index: 4, name: "傳說", next: null });
  });
});

describe("applyAnswer", () => {
  it("awards base level times streak multiplier on a correct answer", () => {
    const first = applyAnswer(INITIAL_ARENA, true);
    expect(first.gain).toBe(1);
    expect(first.state).toMatchObject({ score: 1, streak: 1, totalCorrect: 1 });

    // 連對第二題：倍率變 2，基礎分仍 1（未滿 5 題）。
    const second = applyAnswer(first.state, true);
    expect(second.gain).toBe(gainForCorrect(first.state));
    expect(second.gain).toBe(2);
    expect(second.state.score).toBe(3);
  });

  it("halves (not zeroes) the streak and deducts a flat penalty on a wrong answer", () => {
    const state = { score: 500, streak: 5, totalCorrect: 20, insured: false };
    const wrong = applyAnswer(state, false);
    expect(wrong.penalty).toBe(penaltyForWrong(false));
    expect(wrong.penalty).toBe(3);
    expect(wrong.state).toMatchObject({ score: 497, streak: 2, totalCorrect: 20 });
  });

  it("never lets the score fall below zero", () => {
    const wrong = applyAnswer({ score: 3, streak: 0, totalCorrect: 0, insured: false }, false);
    expect(wrong.state.score).toBe(0);
  });

  it("clears insurance after any answer", () => {
    const correct = applyAnswer({ score: 10, streak: 0, totalCorrect: 0, insured: true }, true);
    expect(correct.state.insured).toBe(false);
  });
});

describe("insurance", () => {
  it("cuts the flat wrong-answer penalty when insured, regardless of score size", () => {
    expect(penaltyForWrong(false)).toBe(3);
    expect(penaltyForWrong(true)).toBe(1);
  });

  it("charges the insurance cost and marks the state insured", () => {
    const insured = buyInsurance({ score: 200, streak: 0, totalCorrect: 0, insured: false });
    expect(insured).toMatchObject({ score: 200 - INSURANCE_COST, insured: true });
  });

  it("refuses insurance when the score is too low or already insured", () => {
    const broke = buyInsurance({ score: 5, streak: 0, totalCorrect: 0, insured: false });
    expect(broke.insured).toBe(false);
    const already = buyInsurance({ score: 500, streak: 0, totalCorrect: 0, insured: true });
    expect(already.score).toBe(500);
  });

  it("keeps the cost low enough for an early low score to afford it", () => {
    // 保險門檻要讓分數還不高的學生（正是最需要緩衝的人）也買得起。
    const insured = buyInsurance({ score: INSURANCE_COST, streak: 0, totalCorrect: 0, insured: false });
    expect(insured.insured).toBe(true);
  });
});

describe("computerAccuracyFor", () => {
  it("starts at a neutral middle value before anyone has answered", () => {
    expect(computerAccuracyFor(0, 0)).toBe(0.5);
  });

  it("stays a little below a strong player instead of running away", () => {
    expect(computerAccuracyFor(10, 10)).toBe(0.65);
  });

  it("eases off for a struggling player instead of staying out of reach", () => {
    expect(computerAccuracyFor(0, 10)).toBe(0.35);
  });

  it("tracks moderately between the two bounds", () => {
    expect(computerAccuracyFor(5, 10)).toBeCloseTo(0.45, 5);
  });
});

describe("streak softening", () => {
  it("halves small streaks instead of zeroing them", () => {
    expect(applyAnswer({ score: 10, streak: 1, totalCorrect: 5, insured: false }, false).state.streak).toBe(0);
    expect(applyAnswer({ score: 10, streak: 3, totalCorrect: 5, insured: false }, false).state.streak).toBe(1);
  });
});
