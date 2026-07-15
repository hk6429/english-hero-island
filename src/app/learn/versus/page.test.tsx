import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import VersusPage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <VersusPage />
    </AdventureProvider>,
  );
}

describe("VersusPage", () => {
  afterEach(cleanup);

  it("starts on a setup form with two name fields", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "兩兩對戰（同一台裝置輪流）" })).toBeInTheDocument();
    expect(screen.getByLabelText("玩家一暱稱")).toBeInTheDocument();
    expect(screen.getByLabelText("玩家二暱稱")).toBeInTheDocument();
  });

  it("shows a hand-off screen before the first player answers", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "開始對戰" }));
    expect(screen.getByRole("heading", { name: /輪到「玩家一」作答/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我準備好了" })).toBeInTheDocument();
  });

  it("reveals a question with options after confirming readiness", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "開始對戰" }));
    fireEvent.click(screen.getByRole("button", { name: "我準備好了" }));
    const options = within(screen.getByRole("list", { name: "選項" })).getAllByRole("button");
    expect(options.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(options[0]);
    expect(screen.getByText(/答對！|答錯了/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /完成，交給下一位|看對戰結果/ })).toBeInTheDocument();
  });
});
