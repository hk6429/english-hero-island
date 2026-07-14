import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createEmptyProgress } from "./progress-types";
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
    };

    await firstPage.save(progress);

    const reloadedPage = new IndexedDbProgressStore({ databaseName });
    expect(await reloadedPage.load()).toEqual(progress);
  });
});
