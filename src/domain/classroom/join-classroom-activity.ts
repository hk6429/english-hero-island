import { z } from "zod";
import type { ClassroomActivity } from "./create-classroom-activity";

const joinRequestSchema = z.object({
  joinCode: z.string().trim().toUpperCase().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/),
  nickname: z.string().trim().min(1).max(12),
  anonymousUserId: z.string().uuid(),
});

const participantSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  anonymousUserId: z.string().uuid(),
  nickname: z.string().min(1).max(12),
  state: z.enum(["joined", "in_progress", "completed", "may_need_help"]),
  joinedAt: z.string().datetime(),
});

export type ClassroomParticipant = Readonly<z.output<typeof participantSchema>>;

type JoinRequest = z.input<typeof joinRequestSchema>;
type Dependencies = Readonly<{
  participantId: () => string;
  now: () => Date;
}>;

export type JoinClassroomActivityResult =
  | Readonly<{ ok: true; participant: ClassroomParticipant }>
  | Readonly<{ ok: false; reason: "invalid_request" | "invalid_code" | "join_closed" }>;

export function joinClassroomActivity(
  activity: ClassroomActivity,
  request: JoinRequest,
  dependencies: Dependencies,
): JoinClassroomActivityResult {
  const parsed = joinRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, reason: "invalid_request" };
  if (parsed.data.joinCode !== activity.joinCode) return { ok: false, reason: "invalid_code" };

  const joinedAt = dependencies.now();
  if (joinedAt.getTime() > new Date(activity.joinClosesAt).getTime()) {
    return { ok: false, reason: "join_closed" };
  }

  const participant = participantSchema.safeParse({
    id: dependencies.participantId(),
    activityId: activity.id,
    anonymousUserId: parsed.data.anonymousUserId,
    nickname: parsed.data.nickname,
    state: "joined",
    joinedAt: joinedAt.toISOString(),
  });

  if (!participant.success) return { ok: false, reason: "invalid_request" };
  return { ok: true, participant: Object.freeze(participant.data) };
}
