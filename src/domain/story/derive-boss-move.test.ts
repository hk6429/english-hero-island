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

  it("keeps one move per session but varies across sessions for the same boss question", () => {
    const questionId = "g3-cvc-boss-01";
    const seedFor = (sessionId: string) => `${sessionId}:${questionId}`;

    expect(deriveBossMove(seedFor("session-alpha"))).toEqual(
      deriveBossMove(seedFor("session-alpha")),
    );

    const moveIds = new Set(
      ["s1", "s2", "s3", "s4", "s5", "s6", "s7"].map(
        (sessionId) => deriveBossMove(seedFor(sessionId)).id,
      ),
    );
    expect(moveIds.size).toBeGreaterThan(1);
  });
});
