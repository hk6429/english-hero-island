import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { AdventureProvider, useAdventure } from "./AdventureProvider";

function Probe() {
  const { ready, progress, dispatch } = useAdventure();
  if (!ready) return <p>讀取中</p>;

  return (
    <div>
      <p>{progress.profile?.nickname ?? "尚未建立"}</p>
      <p>{progress.stage}</p>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: "create_profile",
            profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
          })
        }
      >
        建立英雄
      </button>
    </div>
  );
}

describe("AdventureProvider", () => {
  it("loads progress and persists state-machine actions", async () => {
    const user = userEvent.setup();
    const store = new MemoryProgressStore();
    render(
      <AdventureProvider store={store}>
        <Probe />
      </AdventureProvider>,
    );

    await screen.findByText("尚未建立");
    await user.click(screen.getByRole("button", { name: "建立英雄" }));

    expect(screen.getByText("小浪")).toBeInTheDocument();
    expect(screen.getByText("diagnostic")).toBeInTheDocument();
    expect((await store.load()).profile?.nickname).toBe("小浪");
  });
});
