import { describe, expect, it } from "vitest";
import { makeQuestion } from "@/test/fixtures/question";
import { buildMission } from "./build-mission";

describe("buildMission", () => {
  it("builds three to five practice questions followed by a distinct boss question", () => {
    const practice = Array.from({ length: 4 }, (_, index) =>
      makeQuestion({
        id: `g5-can-practice-${index + 1}`,
        grade: 5,
        microSkill: "age-and-can",
        purpose: "practice",
        variantGroup: `g5-can-surface-${index + 1}`,
      }),
    );
    const boss = makeQuestion({
      id: "g5-can-boss-01",
      grade: 5,
      microSkill: "age-and-can",
      purpose: "boss",
      variantGroup: "g5-can-boss-surface",
    });

    const result = buildMission({
      grade: 5,
      microSkill: "age-and-can",
      bank: [...practice, boss],
      contentMode: "pilot",
      excludeQuestionIds: [],
    });

    expect(result).toMatchObject({ ok: true, pilotContent: true });
    if (result.ok) {
      expect(result.practice).toHaveLength(4);
      expect(result.boss.id).toBe("g5-can-boss-01");
      expect(new Set([...result.practice, result.boss].map((item) => item.variantGroup)).size).toBe(
        5,
      );
    }
  });
});
