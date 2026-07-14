import { describe, expect, it } from "vitest";
import { validateActivityTargets } from "./validate-activity-targets";

const memberA = "11111111-1111-4111-8111-111111111111";
const memberB = "22222222-2222-4222-8222-222222222222";

describe("validateActivityTargets", () => {
  it("keeps whole-class activities open to the classroom without a target list", () => {
    expect(validateActivityTargets("whole_class", [])).toEqual({ ok: true, targetIds: [] });
    expect(validateActivityTargets("whole_class", [memberA])).toEqual({
      ok: false,
      reason: "whole_class_cannot_have_targets",
    });
  });

  it("requires at least two distinct anonymous members for a small group", () => {
    expect(validateActivityTargets("small_group", [memberA, memberB])).toEqual({
      ok: true,
      targetIds: [memberA, memberB],
    });
    expect(validateActivityTargets("small_group", [memberA, memberA])).toEqual({
      ok: false,
      reason: "small_group_requires_two_members",
    });
  });

  it("requires exactly one anonymous member for an individual activity", () => {
    expect(validateActivityTargets("individual", [memberA])).toEqual({
      ok: true,
      targetIds: [memberA],
    });
    expect(validateActivityTargets("individual", [])).toEqual({
      ok: false,
      reason: "individual_requires_one_member",
    });
  });

  it("rejects malformed member identifiers before they reach the database", () => {
    expect(validateActivityTargets("individual", ["seat-01"])).toEqual({
      ok: false,
      reason: "invalid_target_id",
    });
  });
});
