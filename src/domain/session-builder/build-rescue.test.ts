import { describe, expect, it } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { buildRescue } from "./build-rescue";

describe("buildRescue", () => {
  it("picks an existing rescue-purpose question of the same micro skill", () => {
    const question = buildRescue({
      grade: 3,
      microSkill: "cvc-decoding",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: [],
      seed: "session-a",
    });

    expect(question).not.toBeNull();
    expect(question?.purpose).toBe("rescue");
    expect(question?.microSkill).toBe("cvc-decoding");
    expect(question?.grade).toBe(3);
  });

  it("is deterministic for the same seed and can vary across sessions", () => {
    const pick = (seed: string) =>
      buildRescue({
        grade: 3,
        microSkill: "cvc-decoding",
        bank: pilotQuestionBank,
        contentMode: "pilot",
        excludeQuestionIds: [],
        seed,
      });

    expect(pick("session-a")?.id).toBe(pick("session-a")?.id);

    const rescueIds = new Set(
      ["s1", "s2", "s3", "s4", "s5", "s6"].map((seed) => pick(seed)?.id),
    );
    expect(rescueIds.size).toBeGreaterThan(1);
  });

  it("falls back to an unused low-difficulty question of the same micro skill", () => {
    const rescueIds = pilotQuestionBank
      .filter((question) => question.microSkill === "cvc-decoding" && question.purpose === "rescue")
      .map((question) => question.id);

    const question = buildRescue({
      grade: 3,
      microSkill: "cvc-decoding",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: rescueIds,
      seed: "session-a",
    });

    expect(question).not.toBeNull();
    expect(question?.difficulty).toBe(1);
    expect(question?.microSkill).toBe("cvc-decoding");
    expect(rescueIds).not.toContain(question?.id);
  });

  it("returns null instead of inventing a question when no same-skill content exists", () => {
    const letterWritingIds = pilotQuestionBank
      .filter((question) => question.microSkill === "letter-writing")
      .map((question) => question.id);

    const question = buildRescue({
      grade: 3,
      microSkill: "letter-writing",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: letterWritingIds,
      seed: "session-a",
    });

    expect(question).toBeNull();
  });

  it("never selects questions already used in the session", () => {
    const question = buildRescue({
      grade: 3,
      microSkill: "cvc-decoding",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: ["g3-cvc-rescue-01"],
      seed: "s4",
    });

    expect(question?.id).not.toBe("g3-cvc-rescue-01");
  });
});
