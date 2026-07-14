import { describe, expect, it } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { buildReview } from "./build-review";

describe("buildReview", () => {
  it("chooses a review question with a surface the student has not just seen", () => {
    const result = buildReview({
      grade: 3,
      microSkill: "cvc-decoding",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: ["g3-cvc-review-01"],
      excludeVariantGroups: ["g3-cvc-review-map"],
    });

    expect(result).toMatchObject({
      ok: true,
      pilotContent: true,
    });
    if (result.ok) {
      expect(result.question.id).toBe("g3-cvc-review-02");
      expect(result.question.variantGroup).not.toBe("g3-cvc-review-map");
    }
  });
});
