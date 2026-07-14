import { describe, expect, it } from "vitest";
import type { LearningEvent } from "../learning/types";
import { scheduleReview } from "./schedule-review";

const pendingEvent: LearningEvent = Object.freeze({
  id: "event-001",
  type: "question_completed",
  outcome: "pending_support",
  studentId: "student-01",
  sessionId: "session-01",
  questionId: "question-01",
  questionVersion: 1,
  microSkill: "cvc-short-a",
  variantGroup: "cat-family",
  firstSelectedOptionId: "b",
  hintsUsed: 2,
  rescueVariantCorrect: false,
  occurredAt: "2026-07-14T10:00:00.000Z",
  studyDate: "2026-07-14",
});

describe("scheduleReview", () => {
  it("schedules unresolved support for the next study day", () => {
    expect(scheduleReview("cvc-short-a", [pendingEvent])).toEqual({
      microSkill: "cvc-short-a",
      dueDate: "2026-07-15",
      priority: "support",
      reason: "需要以較簡單的同能力變式題再次練習",
    });
  });

  it("schedules cross-day confirmation after an independent answer", () => {
    const independentEvent: LearningEvent = Object.freeze({
      ...pendingEvent,
      id: "event-002",
      outcome: "independent_correct",
      firstSelectedOptionId: "a",
      hintsUsed: 0,
    });

    expect(scheduleReview("cvc-short-a", [independentEvent])).toEqual({
      microSkill: "cvc-short-a",
      dueDate: "2026-07-15",
      priority: "confirmation",
      reason: "換一個表面題，確認這項能力能獨立完成",
    });
  });

  it("moves a mastered skill to a three-day maintenance review", () => {
    const earlier: LearningEvent = Object.freeze({
      ...pendingEvent,
      id: "event-earlier",
      outcome: "independent_correct",
      questionId: "question-cat",
      variantGroup: "cat-family",
      firstSelectedOptionId: "a",
      hintsUsed: 0,
      occurredAt: "2026-07-11T10:00:00.000Z",
      studyDate: "2026-07-11",
    });
    const confirmation: LearningEvent = Object.freeze({
      ...earlier,
      id: "event-confirmation",
      questionId: "question-map",
      variantGroup: "map-family",
      occurredAt: "2026-07-14T10:00:00.000Z",
      studyDate: "2026-07-14",
    });

    expect(scheduleReview("cvc-short-a", [earlier, confirmation])).toEqual({
      microSkill: "cvc-short-a",
      dueDate: "2026-07-17",
      priority: "maintenance",
      reason: "能力已確認，三天後用新題型保持穩定",
    });
  });
});

export { pendingEvent as reviewEvent };
