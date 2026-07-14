import { z } from "zod";
import { validateActivityTargets } from "./validate-activity-targets";

const gradeSchema = z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);
const audienceSchema = z.enum(["whole_class", "small_group", "individual"]);
const questionCountSchema = z.union([z.literal(3), z.literal(5)]);

const createActivityInputSchema = z.object({
  teacherId: z.string().uuid(),
  classroomId: z.string().uuid(),
  title: z.string().trim().min(1).max(80),
  grade: gradeSchema,
  microSkill: z.string().trim().min(1).max(80),
  questionCount: questionCountSchema,
  audience: audienceSchema,
  targetMemberIds: z.array(z.string().uuid()),
});

const classroomActivitySchema = createActivityInputSchema.extend({
  id: z.string().uuid(),
  joinCode: z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/),
  status: z.literal("waiting"),
  createdAt: z.string().datetime(),
  joinClosesAt: z.string().datetime(),
});

export type CreateClassroomActivityInput = z.input<typeof createActivityInputSchema>;
export type ClassroomActivity = Readonly<z.output<typeof classroomActivitySchema>>;

type Dependencies = Readonly<{
  activityId: () => string;
  joinCode: () => string;
  now: () => Date;
}>;

export type CreateClassroomActivityResult =
  | Readonly<{ ok: true; activity: ClassroomActivity }>
  | Readonly<{ ok: false; reasons: string[] }>;

export function createClassroomActivity(
  input: CreateClassroomActivityInput,
  dependencies: Dependencies,
): CreateClassroomActivityResult {
  const parsedInput = createActivityInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, reasons: parsedInput.error.issues.map((issue) => issue.message) };
  }

  const targetValidation = validateActivityTargets(
    parsedInput.data.audience,
    parsedInput.data.targetMemberIds,
  );
  if (!targetValidation.ok) {
    return { ok: false, reasons: [targetValidation.reason] };
  }

  const createdAt = dependencies.now();
  const activity = classroomActivitySchema.safeParse({
    ...parsedInput.data,
    targetMemberIds: targetValidation.targetIds,
    id: dependencies.activityId(),
    joinCode: dependencies.joinCode(),
    status: "waiting",
    createdAt: createdAt.toISOString(),
    joinClosesAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  });

  if (!activity.success) {
    return { ok: false, reasons: activity.error.issues.map((issue) => issue.message) };
  }

  return { ok: true, activity: Object.freeze(activity.data) };
}
