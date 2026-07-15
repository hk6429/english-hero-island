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

  it("first-ever mission keeps the original wording even with completedMissionCount = 1", () => {
    const story = deriveOutcomeStory(["independent_correct"], 1);
    expect(story.title).toBe("星光捷徑已出現");
  });

  it("varies the wording across repeat missions in the same route, without changing id or tone", () => {
    const outcomes: readonly ["independent_correct"] = ["independent_correct"];
    const first = deriveOutcomeStory(outcomes, 1);
    const second = deriveOutcomeStory(outcomes, 2);

    expect(first.title).not.toBe(second.title);
    expect(first.id).toBe(second.id);
    expect(first.tone).toBe(second.tone);
  });
});
