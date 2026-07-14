import { describe, expect, it } from "vitest";
import type { LearningEvent } from "../learning/types";
import { deriveMastery } from "./derive-mastery";

function learningEvent(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return Object.freeze({
    id: "event-001",
    type: "question_completed",
    outcome: "assisted_correct",
    studentId: "student-01",
    sessionId: "session-01",
    questionId: "question-01",
    questionVersion: 1,
    microSkill: "cvc-short-a",
    variantGroup: "cat-family",
    firstSelectedOptionId: "a",
    hintsUsed: 1,
    rescueVariantCorrect: false,
  toolUsed: null,
    occurredAt: "2026-07-14T10:00:00.000Z",
    studyDate: "2026-07-14",
    ...overrides,
  });
}

describe("deriveMastery", () => {
  it("keeps a micro-skill unassessed when there is no evidence", () => {
    expect(deriveMastery("cvc-short-a", [])).toEqual({
      microSkill: "cvc-short-a",
      status: "unassessed",
      independentDates: [],
      independentSurfaces: 0,
    });
  });

  it("marks a micro-skill as practicing when completion still needed support", () => {
    expect(deriveMastery("cvc-short-a", [learningEvent()])).toEqual({
      microSkill: "cvc-short-a",
      status: "practicing",
      independentDates: [],
      independentSurfaces: 0,
    });
  });

  it("waits for cross-day confirmation after one independent answer", () => {
    const firstIndependent = learningEvent({
      outcome: "independent_correct",
      hintsUsed: 0,
    });

    expect(deriveMastery("cvc-short-a", [firstIndependent])).toEqual({
      microSkill: "cvc-short-a",
      status: "pending_confirmation",
      independentDates: ["2026-07-14"],
      independentSurfaces: 1,
    });
  });

  it("marks mastery only after independent answers on two dates and two surfaces", () => {
    const firstIndependent = learningEvent({
      id: "event-first",
      outcome: "independent_correct",
      hintsUsed: 0,
      questionId: "question-cat",
      variantGroup: "cat-family",
      studyDate: "2026-07-11",
      occurredAt: "2026-07-11T10:00:00.000Z",
    });
    const confirmation = learningEvent({
      id: "event-confirmation",
      outcome: "independent_correct",
      hintsUsed: 0,
      questionId: "question-map",
      variantGroup: "map-family",
      studyDate: "2026-07-14",
      occurredAt: "2026-07-14T10:00:00.000Z",
    });

    expect(deriveMastery("cvc-short-a", [firstIndependent, confirmation])).toEqual({
      microSkill: "cvc-short-a",
      status: "mastered",
      independentDates: ["2026-07-11", "2026-07-14"],
      independentSurfaces: 2,
    });
  });
});
