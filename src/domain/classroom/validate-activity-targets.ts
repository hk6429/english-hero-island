import { z } from "zod";

export type ClassroomAudience = "whole_class" | "small_group" | "individual";

export type ActivityTargetValidation =
  | Readonly<{ ok: true; targetIds: ReadonlyArray<string> }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid_target_id"
        | "whole_class_cannot_have_targets"
        | "small_group_requires_two_members"
        | "individual_requires_one_member";
    }>;

const memberIdSchema = z.string().uuid();

export function validateActivityTargets(
  audience: ClassroomAudience,
  targetIds: ReadonlyArray<string>,
): ActivityTargetValidation {
  if (targetIds.some((targetId) => !memberIdSchema.safeParse(targetId).success)) {
    return { ok: false, reason: "invalid_target_id" };
  }

  const distinctTargetIds = [...new Set(targetIds)];

  if (audience === "whole_class") {
    return distinctTargetIds.length === 0
      ? { ok: true, targetIds: [] }
      : { ok: false, reason: "whole_class_cannot_have_targets" };
  }

  if (audience === "small_group") {
    return distinctTargetIds.length >= 2
      ? { ok: true, targetIds: distinctTargetIds }
      : { ok: false, reason: "small_group_requires_two_members" };
  }

  return distinctTargetIds.length === 1
    ? { ok: true, targetIds: distinctTargetIds }
    : { ok: false, reason: "individual_requires_one_member" };
}
