import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { PendingClassroomSubmission } from "./PendingClassroomSubmissionStore";
import { IndexedDbPendingSubmissionStore } from "./IndexedDbPendingSubmissionStore";

const pending: PendingClassroomSubmission = {
  deviceEventId: "77777777-7777-4777-8777-777777777777",
  activityId: "33333333-3333-4333-8333-333333333333",
  participantId: "44444444-4444-4444-8444-444444444444",
  selectedOptionId: "a",
  queuedAt: "2026-07-14T10:00:00.000Z",
  question: {
    position: 1,
    id: "g4-yes-no-practice-01",
    version: 1,
    grade: 4,
    microSkill: "yes-no-questions",
    purpose: "practice",
    modality: "text",
    questionType: "multiple_choice",
    prompt: "Is this a pen?",
    options: [
      { id: "a", text: "Yes, it is." },
      { id: "b", text: "Yes, I am." },
    ],
  },
};

describe("IndexedDbPendingSubmissionStore", () => {
  it("restores one idempotent pending answer after reload and removes it after sync", async () => {
    const databaseName = `classroom-pending-${crypto.randomUUID()}`;
    const firstPage = new IndexedDbPendingSubmissionStore({ databaseName });

    await firstPage.put(pending);
    await firstPage.put(pending);

    const reloadedPage = new IndexedDbPendingSubmissionStore({ databaseName });
    expect(
      await reloadedPage.list(pending.activityId, pending.participantId),
    ).toEqual([pending]);

    await reloadedPage.remove(pending.deviceEventId);
    expect(
      await reloadedPage.list(pending.activityId, pending.participantId),
    ).toEqual([]);
  });

  it("does not expose another participant's queued answer", async () => {
    const store = new IndexedDbPendingSubmissionStore({
      databaseName: `classroom-pending-scope-${crypto.randomUUID()}`,
    });
    await store.put(pending);

    expect(
      await store.list(
        pending.activityId,
        "55555555-5555-4555-8555-555555555555",
      ),
    ).toEqual([]);
  });
});
