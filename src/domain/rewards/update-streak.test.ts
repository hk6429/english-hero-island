import { describe, expect, it } from "vitest";
import { updateStreak } from "./update-streak";

describe("updateStreak", () => {
  it("dims gently after a gap, never reaches zero, and recovers on later study days", () => {
    const afterGap = updateStreak(
      { completedDates: ["2026-07-10"], brightness: 3 },
      "2026-07-13",
    );
    const afterRecovery = updateStreak(afterGap, "2026-07-14");
    const sameDayReplay = updateStreak(afterRecovery, "2026-07-14");

    expect(afterGap).toEqual({
      completedDates: ["2026-07-10", "2026-07-13"],
      brightness: 2,
    });
    expect(afterRecovery.brightness).toBe(3);
    expect(sameDayReplay).toEqual(afterRecovery);

    const repeatedlyInterrupted = ["2026-07-17", "2026-07-20", "2026-07-23"].reduce(
      (streak, date) => updateStreak(streak, date),
      afterRecovery,
    );
    expect(repeatedlyInterrupted.brightness).toBe(1);
  });
});
