import { describe, expect, it } from "vitest";
import { deriveOutcomeStory } from "./derive-outcome-story";

describe("deriveOutcomeStory", () => {
  it("creates distinct, non-shaming story branches from the learning evidence", () => {
    const independent = deriveOutcomeStory([
      "independent_correct",
      "independent_correct",
      "independent_correct",
    ]);
    const strategic = deriveOutcomeStory([
      "independent_correct",
      "assisted_correct",
      "rescued",
    ]);
    const supported = deriveOutcomeStory([
      "assisted_correct",
      "rescued",
      "pending_support",
    ]);

    expect([independent.id, strategic.id, supported.id]).toEqual([
      "starlight-route",
      "echo-route",
      "campfire-route",
    ]);
    expect(new Set([independent.title, strategic.title, supported.title]).size).toBe(3);

    for (const branch of [independent, strategic, supported]) {
      expect(`${branch.title}${branch.story}`).not.toMatch(/失敗|太弱|落後|你不會/);
    }
  });
});
