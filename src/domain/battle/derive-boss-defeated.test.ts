import { describe, expect, it } from "vitest";
import type { LearningEvent, LearningOutcome } from "@/domain/learning/types";
import { makeQuestion } from "@/test/fixtures/question";
import { deriveBossDefeated } from "./derive-boss-defeated";

function makeEvent(questionId: string, outcome: LearningOutcome): LearningEvent {
  return {
    id: `event-${questionId}`,
    type: "question_completed",
    outcome,
    studentId: "student-1",
    sessionId: "session-1",
    questionId,
    questionVersion: 1,
    microSkill: "cvc-decoding",
    variantGroup: "fixture-family",
    firstSelectedOptionId: "a",
    hintsUsed: 0,
    toolUsed: null,
    rescueVariantCorrect: false,
    occurredAt: "2026-01-01T00:00:00.000Z",
    studyDate: "2026-01-01",
  };
}

describe("deriveBossDefeated", () => {
  const bank = [
    makeQuestion({ id: "practice-1", purpose: "practice" }),
    makeQuestion({ id: "boss-1", purpose: "boss" }),
  ];

  it("is true when the boss question's own event resolved to a correct outcome", () => {
    const events = [
      makeEvent("practice-1", "independent_correct"),
      makeEvent("boss-1", "assisted_correct"),
    ];

    expect(deriveBossDefeated(events, bank)).toBe(true);
  });

  it("is false when the boss question is still pending support", () => {
    const events = [
      makeEvent("practice-1", "independent_correct"),
      makeEvent("boss-1", "pending_support"),
    ];

    expect(deriveBossDefeated(events, bank)).toBe(false);
  });

  it("is false when no event references the boss question at all", () => {
    const events = [makeEvent("practice-1", "independent_correct")];

    expect(deriveBossDefeated(events, bank)).toBe(false);
  });
});
