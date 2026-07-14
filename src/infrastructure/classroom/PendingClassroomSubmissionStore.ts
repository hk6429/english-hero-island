import type { ClassroomStudentQuestion } from "@/infrastructure/supabase/classroom-gateway";

export type PendingClassroomSubmission = Readonly<{
  deviceEventId: string;
  activityId: string;
  participantId: string;
  selectedOptionId: string;
  hintsUsed: number;
  queuedAt: string;
  question: ClassroomStudentQuestion;
}>;

export interface PendingClassroomSubmissionStore {
  list(
    activityId: string,
    participantId: string,
  ): Promise<ReadonlyArray<PendingClassroomSubmission>>;
  put(submission: PendingClassroomSubmission): Promise<void>;
  remove(deviceEventId: string): Promise<void>;
}
