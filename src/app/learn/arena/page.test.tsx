import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import ArenaPage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <ArenaPage />
    </AdventureProvider>,
  );
}

describe("ArenaPage", () => {
  afterEach(cleanup);

  it("opens a match with a fresh scoreboard and the first question", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "積分挑戰（單人對電腦）" })).toBeInTheDocument();
    expect(screen.getByText("你")).toBeInTheDocument();
    expect(screen.getByText("電腦")).toBeInTheDocument();
    expect(screen.getByText(/第 1 \/ /)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "選項" })).toBeInTheDocument();
  });

  it("disables the insurance button while the score is below the cost", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /買護盾/ })).toBeDisabled();
  });

  it("shows feedback and a next-step button after answering", () => {
    renderPage();
    const options = within(screen.getByRole("list", { name: "選項" })).getAllByRole("button");
    fireEvent.click(options[0]);
    expect(screen.getByText(/答對！|答錯了/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /下一題|看對戰結果/ })).toBeInTheDocument();
  });
});
