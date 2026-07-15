import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  dueOrder,
  initBoxes,
  isAllMastered,
  LEITNER_MAX_BOX,
  promoteBox,
} from "./leitner";

describe("leitner box logic", () => {
  it("promotes on known, capping at box 5", () => {
    expect(promoteBox(1, true)).toBe(2);
    expect(promoteBox(4, true)).toBe(5);
    expect(promoteBox(5, true)).toBe(LEITNER_MAX_BOX);
  });

  it("drops back only one box on unknown, floored at box 1", () => {
    expect(promoteBox(5, false)).toBe(4);
    expect(promoteBox(3, false)).toBe(2);
    expect(promoteBox(1, false)).toBe(1);
  });

  it("initialises every key at box 1", () => {
    expect(initBoxes(["cat", "dog"])).toEqual({ cat: 1, dog: 1 });
  });

  it("applyAnswer is immutable and updates one key", () => {
    const start = initBoxes(["cat", "dog"]);
    const next = applyAnswer(start, "cat", true);
    expect(next).toEqual({ cat: 2, dog: 1 });
    expect(start).toEqual({ cat: 1, dog: 1 });
  });

  it("orders low boxes first, stable within a box", () => {
    const boxes = { cat: 3, dog: 1, pig: 3, sun: 1 };
    expect(dueOrder(["cat", "dog", "pig", "sun"], boxes)).toEqual(["dog", "sun", "cat", "pig"]);
  });

  it("treats missing keys as box 1", () => {
    expect(dueOrder(["cat", "dog"], { cat: 4 })).toEqual(["dog", "cat"]);
  });

  it("reports mastery only when every key reaches box 5", () => {
    expect(isAllMastered(["cat", "dog"], { cat: 5, dog: 5 })).toBe(true);
    expect(isAllMastered(["cat", "dog"], { cat: 5, dog: 3 })).toBe(false);
    expect(isAllMastered([], {})).toBe(false);
  });
});
