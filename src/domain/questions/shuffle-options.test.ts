import { describe, expect, it } from "vitest";
import { seededShuffle, shuffledOptions } from "./shuffle-options";

describe("seededShuffle", () => {
  it("returns a permutation of the same items", () => {
    const items = ["a", "b", "c", "d", "e"];
    const shuffled = seededShuffle(items, "seed-1");
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("is deterministic for the same seed", () => {
    const items = ["a", "b", "c", "d"];
    expect(seededShuffle(items, "same-seed")).toEqual(seededShuffle(items, "same-seed"));
  });

  it("produces different orders across many seeds most of the time", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const orders = new Set(
      Array.from({ length: 20 }, (_, index) => seededShuffle(items, `seed-${index}`).join(",")),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c"];
    seededShuffle(items, "seed");
    expect(items).toEqual(["a", "b", "c"]);
  });
});

describe("shuffledOptions", () => {
  const question = {
    id: "q-1",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
  };

  it("keeps the same options but reorders them based on the seed", () => {
    const result = shuffledOptions(question, "session-1");
    expect(result.map((option) => option.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("does not put the correct answer at index 0 for every seed (regression guard)", () => {
    const correctFirstCount = Array.from({ length: 50 }, (_, index) =>
      shuffledOptions(question, `session-${index}`),
    ).filter((options) => options[0].id === "a").length;

    // 若真的隨機打散，落在第一位的比例應遠低於 100%（4 選項理論值約 25%）。
    expect(correctFirstCount).toBeLessThan(45);
  });

  it("is stable for the same session+question seed", () => {
    const first = shuffledOptions(question, "session-42");
    const second = shuffledOptions(question, "session-42");
    expect(first.map((option) => option.id)).toEqual(second.map((option) => option.id));
  });
});
