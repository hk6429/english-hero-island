import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import ClassBattlePage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <ClassBattlePage />
    </AdventureProvider>,
  );
}

describe("ClassBattlePage", () => {
  afterEach(cleanup);

  it("stays fail-closed when no realtime backend is configured", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "即時後端尚未連線" })).toBeInTheDocument();
  });

  it("labels the demo bar as an illustration, not real class data", () => {
    renderPage();
    expect(screen.getByText(/範例，非真實班級資料/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "全班能量進度示意" })).toBeInTheDocument();
  });
});
