import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { createEmptyProgress } from "@/infrastructure/progress/progress-types";
import DexPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

async function renderDexPage(store: MemoryProgressStore) {
  const view = render(
    <AdventureProvider store={store}>
      <DexPage />
    </AdventureProvider>,
  );
  await screen.findByText("能力圖鑑");
  return view;
}

describe("DexPage", () => {
  afterEach(cleanup);

  it("shows one card per grade microSkill, not just the single focus skill", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 6, heroId: "forest-keeper" },
      dexEntries: ["present-progressive", "clothing-and-have"],
    });

    await renderDexPage(store);

    const grid = screen.getByRole("region", { name: "能力卡收藏" });
    expect(within(grid).getByText("現在進行式")).toBeInTheDocument();
    expect(within(grid).getByText("衣物與 have")).toBeInTheDocument();
    expect(within(grid).getByText("職業與家庭")).toBeInTheDocument();
    expect(within(grid).getByText("地點與去向")).toBeInTheDocument();
    expect(within(grid).getByText("整合對話短文")).toBeInTheDocument();
  });

  it("only marks a microSkill as collected once its own dex entry exists", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 6, heroId: "forest-keeper" },
      dexEntries: ["present-progressive"],
    });

    await renderDexPage(store);

    const grid = screen.getByRole("region", { name: "能力卡收藏" });
    const collectedCard = within(grid).getByText("現在進行式").closest("article");
    const lockedCard = within(grid).getByText("衣物與 have").closest("article");

    expect(within(collectedCard!).getByText("已收入圖鑑")).toBeInTheDocument();
    expect(within(lockedCard!).queryByText("已收入圖鑑")).not.toBeInTheDocument();
  });
});
