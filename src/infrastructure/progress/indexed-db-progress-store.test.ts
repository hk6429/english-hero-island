import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createEmptyProgress, type ProgressSnapshot } from "./progress-types";
import { IndexedDbProgressStore } from "./IndexedDbProgressStore";

describe("IndexedDbProgressStore", () => {
  it("restores progress in a new store instance after a page reload", async () => {
    const databaseName = `hero-island-test-${crypto.randomUUID()}`;
    const firstPage = new IndexedDbProgressStore({ databaseName });
    const progress = {
      ...createEmptyProgress(),
      profile: {
        nickname: "星星",
        grade: 6 as const,
        heroId: "star-smith" as const,
      },
      stage: "island" as const,
      xp: 40,
      starlightKeys: 2,
      starlightKeyDates: ["2026-07-14", "2026-07-15"],
      partnerEncouragements: [
        {
          id: "relay-01",
          message: "拆字橋：把題目拆成小步驟。",
          applicationResponse: "下一題先把題目拆成兩個小步驟",
          receivedAt: "2026-07-14T10:00:00.000Z",
        },
      ],
    };

    await firstPage.save(progress);

    const reloadedPage = new IndexedDbProgressStore({ databaseName });
    expect(await reloadedPage.load()).toEqual(progress);
  });

  it("adds new collection fields when loading an older local snapshot", async () => {
    const databaseName = `hero-island-legacy-${crypto.randomUUID()}`;
    const legacySnapshot = Object.fromEntries(
      Object.entries(createEmptyProgress()).filter(
        ([key]) =>
          key !== "discoveries" &&
          key !== "starlightKeys" &&
          key !== "starlightKeyDates" &&
          key !== "partnerEncouragements",
      ),
    ) as ProgressSnapshot;

    const oldVersion = new IndexedDbProgressStore({ databaseName });
    await oldVersion.save(legacySnapshot);

    const upgradedVersion = new IndexedDbProgressStore({ databaseName });
    const upgraded = await upgradedVersion.load();
    expect(upgraded.discoveries).toEqual([]);
    expect(upgraded.starlightKeys).toBe(0);
    expect(upgraded.starlightKeyDates).toEqual([]);
    expect(upgraded.partnerEncouragements).toEqual([]);
  });
});
