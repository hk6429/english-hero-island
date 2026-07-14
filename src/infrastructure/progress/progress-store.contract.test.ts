import { describe, expect, it } from "vitest";
import type { LearningEvent } from "@/domain/learning/types";
import { createEmptyProgress } from "./progress-types";
import { MemoryProgressStore } from "./MemoryProgressStore";

describe("ProgressStore contract", () => {
  it("saves and reloads anonymous student progress", async () => {
    const store = new MemoryProgressStore();
    const progress = {
      ...createEmptyProgress(),
      profile: {
        nickname: "小海",
        grade: 4 as const,
        heroId: "wave-scout" as const,
      },
      xp: 25,
    };

    await store.save(progress);

    expect(await store.load()).toEqual(progress);
  });

  it("deduplicates immutable learning events by event id", async () => {
    const store = new MemoryProgressStore();
    const event: LearningEvent = Object.freeze({
      id: "event-001",
      type: "question_completed",
      outcome: "independent_correct",
      studentId: "student-01",
      sessionId: "session-01",
      questionId: "question-01",
      questionVersion: 1,
      microSkill: "cvc-decoding",
      variantGroup: "cat-family",
      firstSelectedOptionId: "a",
      hintsUsed: 0,
      rescueVariantCorrect: false,
  toolUsed: null,
      occurredAt: "2026-07-14T10:00:00.000Z",
      studyDate: "2026-07-14",
    });

    expect(await store.appendLearningEvent(event)).toBe(true);
    expect(await store.appendLearningEvent(event)).toBe(false);
    expect((await store.load()).events).toEqual([event]);
  });
});
