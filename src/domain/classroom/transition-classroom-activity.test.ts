import { describe, expect, it } from "vitest";
import { transitionClassroomActivity } from "./transition-classroom-activity";

describe("transitionClassroomActivity", () => {
  it.each([
    ["waiting", "start", "active"],
    ["waiting", "end", "ended"],
    ["active", "complete", "completed"],
    ["active", "end", "ended"],
  ] as const)("moves %s through %s to %s", (status, action, expected) => {
    expect(transitionClassroomActivity(status, action)).toEqual({
      ok: true,
      status: expected,
    });
  });

  it.each([
    ["waiting", "complete"],
    ["active", "start"],
    ["completed", "start"],
    ["ended", "complete"],
  ] as const)("rejects %s through %s", (status, action) => {
    expect(transitionClassroomActivity(status, action)).toEqual({
      ok: false,
      reason: "invalid_activity_transition",
    });
  });
});
