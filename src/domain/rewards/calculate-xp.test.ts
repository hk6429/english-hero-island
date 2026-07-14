import { describe, expect, it } from "vitest";
import type { LearningEvent } from "../learning/types";
import { calculateXp } from "./calculate-xp";

const event: LearningEvent = Object.freeze({
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
  occurredAt: "2026-07-14T10:00:00.000Z",
  studyDate: "2026-07-14",
});

describe("calculateXp", () => {
  it("awards completion and first-independent bonuses", () => {
    expect(calculateXp(event, [])).toEqual({
      completion: 5,
      learning: 5,
      total: 10,
      duplicate: false,
    });
  });

  it("does not award XP for the same question again on the same day", () => {
    const repeatedEvent: LearningEvent = Object.freeze({
      ...event,
      id: "event-002",
      occurredAt: "2026-07-14T10:05:00.000Z",
    });

    expect(calculateXp(repeatedEvent, [event])).toEqual({
      completion: 0,
      learning: 0,
      total: 0,
      duplicate: true,
    });
  });

  it("awards a smaller learning bonus for an assisted correct answer", () => {
    const assistedEvent: LearningEvent = Object.freeze({
      ...event,
      id: "event-003",
      questionId: "question-02",
      outcome: "assisted_correct",
      hintsUsed: 1,
    });

    expect(calculateXp(assistedEvent, [])).toEqual({
      completion: 5,
      learning: 2,
      total: 7,
      duplicate: false,
    });
  });

  it("awards the next-day independent review bonus on a different surface question", () => {
    const previousDay: LearningEvent = Object.freeze({
      ...event,
      id: "event-previous",
      questionId: "question-previous",
      variantGroup: "map-family",
      occurredAt: "2026-07-13T10:00:00.000Z",
      studyDate: "2026-07-13",
    });

    expect(calculateXp(event, [previousDay])).toEqual({
      completion: 5,
      learning: 10,
      total: 15,
      duplicate: false,
    });
  });

  it("awards the larger independent review bonus after three days", () => {
    const threeDaysEarlier: LearningEvent = Object.freeze({
      ...event,
      id: "event-three-days-earlier",
      questionId: "question-three-days-earlier",
      variantGroup: "fan-family",
      occurredAt: "2026-07-11T10:00:00.000Z",
      studyDate: "2026-07-11",
    });

    expect(calculateXp(event, [threeDaysEarlier])).toEqual({
      completion: 5,
      learning: 15,
      total: 20,
      duplicate: false,
    });
  });
});

export { event as rewardEvent };
