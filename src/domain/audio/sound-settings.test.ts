import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSoundEnabled, setSoundEnabled } from "./sound-settings";

describe("sound settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to disabled before the student ever opts in", () => {
    expect(isSoundEnabled()).toBe(false);
  });

  it("persists an explicit opt-in across reads", () => {
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it("persists turning sound back off", () => {
    setSoundEnabled(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
  });
});
