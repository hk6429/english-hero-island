import type {
  PendingClassroomSubmission,
  PendingClassroomSubmissionStore,
} from "./PendingClassroomSubmissionStore";

export class MemoryPendingSubmissionStore implements PendingClassroomSubmissionStore {
  private readonly submissions = new Map<string, PendingClassroomSubmission>();

  async list(
    activityId: string,
    participantId: string,
  ): Promise<ReadonlyArray<PendingClassroomSubmission>> {
    return [...this.submissions.values()]
      .filter(
        (submission) =>
          submission.activityId === activityId &&
          submission.participantId === participantId,
      )
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
      .map((submission) => structuredClone(submission));
  }

  async put(submission: PendingClassroomSubmission): Promise<void> {
    this.submissions.set(submission.deviceEventId, structuredClone(submission));
  }

  async remove(deviceEventId: string): Promise<void> {
    this.submissions.delete(deviceEventId);
  }
}
