import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbClassroomSupportEvidenceStore } from "./IndexedDbClassroomSupportEvidenceStore";

const scope = {
  activityId: "33333333-3333-4333-8333-333333333333",
  participantId: "44444444-4444-4444-8444-444444444444",
  questionId: "g4-listening-letter-b-01",
  questionVersion: 1,
};

describe("IndexedDbClassroomSupportEvidenceStore", () => {
  it("restores one revealed transcript marker without leaking across scopes", async () => {
    const databaseName = `classroom-support-${crypto.randomUUID()}`;
    const firstPage = new IndexedDbClassroomSupportEvidenceStore({ databaseName });

    await firstPage.markTranscriptRevealed(scope);

    const reloadedPage = new IndexedDbClassroomSupportEvidenceStore({ databaseName });
    await expect(reloadedPage.get(scope)).resolves.toBe(1);
    await expect(
      reloadedPage.get({ ...scope, questionVersion: 2 }),
    ).resolves.toBe(0);
    await expect(
      reloadedPage.get({
        ...scope,
        participantId: "55555555-5555-4555-8555-555555555555",
      }),
    ).resolves.toBe(0);

    await reloadedPage.clear(scope);
    await expect(reloadedPage.get(scope)).resolves.toBe(0);
  });
});
