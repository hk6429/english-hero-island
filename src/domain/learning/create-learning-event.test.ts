import { describe, expect, it } from "vitest";
import { createLearningEvent } from "./create-learning-event";

describe("createLearningEvent", () => {
  it("records a first independent correct answer as an immutable event", () => {
    const event = createLearningEvent({
      eventId: "event-001",
      studentId: "anonymous-student-01",
      sessionId: "session-01",
      occurredAt: "2026-07-14T10:00:00.000Z",
      studyDate: "2026-07-14",
      question: {
        id: "g3-cvc-practice-01",
        version: 1,
        microSkill: "cvc-short-a",
        variantGroup: "g3-cvc-short-a-cat",
        correctOptionId: "a",
      },
      response: {
        firstSelectedOptionId: "a",
        hintsUsed: 0,
        rescueVariantCorrect: false,
      },
    });

    expect(event).toMatchObject({
      id: "event-001",
      outcome: "independent_correct",
      questionId: "g3-cvc-practice-01",
      questionVersion: 1,
      microSkill: "cvc-short-a",
      variantGroup: "g3-cvc-short-a-cat",
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("records a correct answer after a hint as assisted", () => {
    const event = createLearningEvent({
      eventId: "event-002",
      studentId: "anonymous-student-01",
      sessionId: "session-01",
      occurredAt: "2026-07-14T10:01:00.000Z",
      studyDate: "2026-07-14",
      question: {
        id: "g3-cvc-practice-02",
        version: 1,
        microSkill: "cvc-short-a",
        variantGroup: "g3-cvc-short-a-map",
        correctOptionId: "b",
      },
      response: {
        firstSelectedOptionId: "b",
        hintsUsed: 1,
        rescueVariantCorrect: false,
      },
    });

    expect(event.outcome).toBe("assisted_correct");
  });

  it("records a completed rescue variant as rescued", () => {
    const event = createLearningEvent({
      eventId: "event-003",
      studentId: "anonymous-student-01",
      sessionId: "session-01",
      occurredAt: "2026-07-14T10:02:00.000Z",
      studyDate: "2026-07-14",
      question: {
        id: "g3-cvc-practice-03",
        version: 1,
        microSkill: "cvc-short-a",
        variantGroup: "g3-cvc-short-a-hat",
        correctOptionId: "c",
      },
      response: {
        firstSelectedOptionId: "a",
        hintsUsed: 2,
        rescueVariantCorrect: true,
      },
    });

    expect(event.outcome).toBe("rescued");
  });
});
