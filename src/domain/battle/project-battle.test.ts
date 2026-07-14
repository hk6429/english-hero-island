import { describe, expect, it } from "vitest";
import type { LearningEvent } from "../learning/types";
import { projectBattle } from "./project-battle";

const independentEvent: LearningEvent = Object.freeze({
  id: "event-001",
  type: "question_completed",
  outcome: "independent_correct",
  studentId: "student-01",
  sessionId: "session-01",
  questionId: "question-01",
  questionVersion: 1,
  microSkill: "cvc-short-a",
  variantGroup: "cat-family",
  firstSelectedOptionId: "a",
  hintsUsed: 0,
  rescueVariantCorrect: false,
  toolUsed: null,
  occurredAt: "2026-07-14T10:00:00.000Z",
  studyDate: "2026-07-14",
});

describe("projectBattle", () => {
  it("turns an independent answer into a critical hit without changing focus shields", () => {
    const next = projectBattle(
      { armor: 4, shields: 3, combo: 0, rescueActive: false },
      independentEvent,
    );

    expect(next).toEqual({
      armor: 3,
      shields: 3,
      combo: 1,
      rescueActive: false,
      action: "critical_hit",
    });
  });

  it("starts rescue teaching instead of game over when the last shield is used", () => {
    const pendingEvent: LearningEvent = Object.freeze({
      ...independentEvent,
      id: "event-002",
      outcome: "pending_support",
      firstSelectedOptionId: "b",
    });

    const next = projectBattle(
      { armor: 4, shields: 1, combo: 2, rescueActive: false },
      pendingEvent,
    );

    expect(next).toEqual({
      armor: 4,
      shields: 0,
      combo: 0,
      rescueActive: true,
      action: "enemy_counter",
    });
  });

  it("uses a standard hit and ends the combo after an assisted answer", () => {
    const assistedEvent: LearningEvent = Object.freeze({
      ...independentEvent,
      id: "event-003",
      outcome: "assisted_correct",
      hintsUsed: 1,
    });

    const next = projectBattle(
      { armor: 3, shields: 2, combo: 2, rescueActive: false },
      assistedEvent,
    );

    expect(next).toEqual({
      armor: 2,
      shields: 2,
      combo: 0,
      rescueActive: false,
      action: "standard_hit",
    });
  });

  it("uses a partner hit to clear armor after rescue teaching", () => {
    const rescuedEvent: LearningEvent = Object.freeze({
      ...independentEvent,
      id: "event-004",
      outcome: "rescued",
      firstSelectedOptionId: "b",
      hintsUsed: 2,
      rescueVariantCorrect: true,
  toolUsed: null,
    });

    const next = projectBattle(
      { armor: 2, shields: 0, combo: 0, rescueActive: true },
      rescuedEvent,
    );

    expect(next).toEqual({
      armor: 1,
      shields: 0,
      combo: 0,
      rescueActive: false,
      action: "partner_hit",
    });
  });
});

export { independentEvent };
