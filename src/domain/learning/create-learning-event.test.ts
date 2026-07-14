import { describe, expect, it } from "vitest";
import { createLearningEvent } from "./create-learning-event";
import type { CreateLearningEventInput } from "./types";

function buildInput(
  response: Partial<CreateLearningEventInput["response"]>,
): CreateLearningEventInput {
  return {
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
      finalSelectedOptionId: "a",
      hintsUsed: 0,
      toolUsed: null,
      rescueVariantCorrect: false,
      ...response,
    },
  };
}

describe("createLearningEvent", () => {
  it("records a first independent correct answer as an immutable event", () => {
    const event = createLearningEvent(buildInput({}));

    expect(event).toMatchObject({
      id: "event-001",
      outcome: "independent_correct",
      questionId: "g3-cvc-practice-01",
      questionVersion: 1,
      microSkill: "cvc-short-a",
      variantGroup: "g3-cvc-short-a-cat",
      toolUsed: null,
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("records a correct first answer after a hint as assisted", () => {
    const event = createLearningEvent(
      buildInput({ hintsUsed: 1, toolUsed: "word-bridge" }),
    );

    expect(event.outcome).toBe("assisted_correct");
    expect(event.toolUsed).toBe("word-bridge");
  });

  it("records a correct retry after a wrong first answer as assisted, not rescued", () => {
    const event = createLearningEvent(
      buildInput({
        firstSelectedOptionId: "b",
        finalSelectedOptionId: "a",
        hintsUsed: 1,
        toolUsed: "sound-lens",
      }),
    );

    expect(event.outcome).toBe("assisted_correct");
    expect(event.rescueVariantCorrect).toBe(false);
  });

  it("records two wrong answers as pending support", () => {
    const event = createLearningEvent(
      buildInput({
        firstSelectedOptionId: "b",
        finalSelectedOptionId: "c",
        hintsUsed: 2,
        toolUsed: "example-card",
      }),
    );

    expect(event.outcome).toBe("pending_support");
  });

  it("records rescued only for a completed rescue variant question", () => {
    const event = createLearningEvent(
      buildInput({
        firstSelectedOptionId: "a",
        finalSelectedOptionId: "a",
        hintsUsed: 1,
        toolUsed: "word-bridge",
        rescueVariantCorrect: true,
      }),
    );

    expect(event.outcome).toBe("rescued");
  });

  it("keeps toolUsed null when the learner answered without any hint tool", () => {
    const event = createLearningEvent(buildInput({ toolUsed: null }));

    expect(event.toolUsed).toBeNull();
  });
});
