import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { AppShell } from "./AppShell";

async function seededStore() {
  const store = new MemoryProgressStore();
  const snapshot = await store.load();
  await store.save({
    ...snapshot,
    stage: "island",
    xp: 30,
    profile: { nickname: "小海星", grade: 4, heroId: "forest-keeper", accent: "coral" },
  });
  return store;
}

describe("AppShell", () => {
  afterEach(cleanup);

  it("always shows the fail-closed pilot disclosure banner", () => {
    render(
      <AdventureProvider store={new MemoryProgressStore()}>
        <AppShell>
          <p>內容</p>
        </AppShell>
      </AdventureProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "試作內容：200 題原創草稿，待兩位英語教師複核，不作正式評量。",
    );
  });

  it("shows the hero glyph with the student's accent beside the nickname", async () => {
    const { container } = render(
      <AdventureProvider store={await seededStore()}>
        <AppShell>
          <p>內容</p>
        </AppShell>
      </AdventureProvider>,
    );

    const status = await screen.findByRole("group", { name: "英雄狀態" });
    expect(status).toHaveTextContent("小海星");
    expect(status).toHaveTextContent("4 年級");
    expect(container.querySelector(".hero-status .hero-glyph")).toHaveClass(
      "hero-forest-keeper",
      "hero-accent-coral",
    );
    expect(screen.getByLabelText("目前累積 30 XP")).toBeInTheDocument();
  });
});
