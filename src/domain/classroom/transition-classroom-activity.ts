export type ClassroomActivityStatus = "waiting" | "active" | "completed" | "ended";
export type ClassroomActivityAction = "start" | "complete" | "end";

export type ClassroomActivityTransition =
  | Readonly<{ ok: true; status: ClassroomActivityStatus }>
  | Readonly<{ ok: false; reason: "invalid_activity_transition" }>;

const transitions: Readonly<
  Partial<
    Record<
      ClassroomActivityStatus,
      Partial<Record<ClassroomActivityAction, ClassroomActivityStatus>>
    >
  >
> = {
  waiting: { start: "active", end: "ended" },
  active: { complete: "completed", end: "ended" },
};

export function transitionClassroomActivity(
  status: ClassroomActivityStatus,
  action: ClassroomActivityAction,
): ClassroomActivityTransition {
  const nextStatus = transitions[status]?.[action];
  return nextStatus
    ? { ok: true, status: nextStatus }
    : { ok: false, reason: "invalid_activity_transition" };
}
