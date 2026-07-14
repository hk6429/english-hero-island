import { describe, expect, it } from "vitest";
import { deriveBossMove } from "./derive-boss-move";

describe("deriveBossMove", () => {
  it("uses stable, controlled story moves without changing the learning rules", () => {
    const seeds = ["a", "b", "c"];
    const moves = seeds.map(deriveBossMove);

    expect(new Set(moves.map((move) => move.id)).size).toBe(3);
    expect(deriveBossMove("a")).toEqual(deriveBossMove("a"));

    for (const move of moves) {
      expect(move.ruleNotice).toBe("只改變故事演出；題目、提示與 XP 規則完全相同。");
      expect(move.name.length).toBeGreaterThan(0);
      expect(move.strategy.length).toBeGreaterThan(0);
    }
  });
});
