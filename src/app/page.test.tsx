import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import HomePage from "./page";

async function storeWithProfile() {
  const store = new MemoryProgressStore();
  const snapshot = await store.load();
  await store.save({
    ...snapshot,
    stage: "mission",
    profile: { nickname: "小海星", grade: 5, heroId: "wave-scout", accent: "gold" },
  });
  return store;
}

describe("HomePage", () => {
  afterEach(cleanup);

  it("invites a new visitor with trust chips and the start action", async () => {
    render(
      <AdventureProvider store={new MemoryProgressStore()}>
        <HomePage />
      </AdventureProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "把不熟的地方，修成自己的能力島。" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /開始冒險/ })).toHaveAttribute(
      "href",
      "/start",
    );

    const trustChips = screen.getByRole("list", { name: "給家長與孩子的三個安心點" });
    expect(trustChips).toHaveTextContent("一場任務約 3–5 分鐘");
    expect(trustChips).toHaveTextContent("答錯有線索與救援");
    expect(trustChips).toHaveTextContent("不公開成績與排名");
  });

  it("welcomes a returning hero back to where the adventure stopped", async () => {
    render(
      <AdventureProvider store={await storeWithProfile()}>
        <HomePage />
      </AdventureProvider>,
    );

    expect(await screen.findByRole("link", { name: /繼續我的冒險/ })).toHaveAttribute(
      "href",
      "/mission",
    );
    expect(screen.getByText(/上次冒險停在「今日任務」/)).toBeInTheDocument();
  });
});
