export type ClassroomSupportScope = Readonly<{
  activityId: string;
  participantId: string;
  questionId: string;
  questionVersion: number;
}>;

export interface ClassroomSupportEvidenceStore {
  get(scope: ClassroomSupportScope): Promise<0 | 1>;
  markTranscriptRevealed(scope: ClassroomSupportScope): Promise<void>;
  clear(scope: ClassroomSupportScope): Promise<void>;
}

export function classroomSupportScopeKey(scope: ClassroomSupportScope): string {
  return JSON.stringify([
    scope.activityId,
    scope.participantId,
    scope.questionId,
    scope.questionVersion,
  ]);
}
