import { describe, expect, it } from "vitest";
import type { LearningEvent, LearningOutcome } from "../learning/types";
import { recommendMission } from "./recommend-mission";

function event(
  microSkill: string,
  outcome: LearningOutcome,
  index: number,
): LearningEvent {
  return Object.freeze({
    id: `event-${index}`,
    type: "question_completed",
    outcome,
    studentId: "student-01",
    sessionId: "diagnostic-01",
    questionId: `question-${index}`,
    questionVersion: 1,
    microSkill,
    variantGroup: `variant-${index}`,
    firstSelectedOptionId: "a",
    hintsUsed: outcome === "independent_correct" ? 0 : 1,
    rescueVariantCorrect: outcome === "rescued",
    occurredAt: `2026-07-14T10:0${index}:00.000Z`,
    studyDate: "2026-07-14",
  });
}

describe("recommendMission", () => {
  it("recommends the weakest observed micro-skill without labeling the child", () => {
    const events = [
      event("image-sentence-match", "independent_correct", 1),
      event("affirmative-negative", "assisted_correct", 2),
      event("this-that-questions", "rescued", 3),
      event("yes-no-questions", "pending_support", 4),
      event("cvc-decoding", "independent_correct", 5),
    ];

    expect(recommendMission(4, events)).toEqual({
      microSkill: "yes-no-questions",
      evidenceOutcome: "pending_support",
      reason: "先修復這一小段能力，完成後地圖就會亮起來。",
    });
  });
});
