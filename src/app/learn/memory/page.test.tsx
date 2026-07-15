import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import MemoryPage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <MemoryPage />
    </AdventureProvider>,
  );
}

describe("MemoryPage", () => {
  afterEach(cleanup);

  it("deals sixteen face-down cards, each with a positional label", () => {
    renderPage();
    expect(screen.getAllByRole("button", { name: /^第 \d+ 張，蓋著的牌$/ })).toHaveLength(16);
    expect(screen.getByRole("button", { name: "第 1 張，蓋著的牌" })).toBeInTheDocument();
    expect(screen.getByText(/配對 0 \/ 8/)).toBeInTheDocument();
  });

  it("reveals a card's face when tapped", () => {
    renderPage();
    const first = screen.getAllByRole("button", { name: /^第 \d+ 張，蓋著的牌$/ })[0];
    fireEvent.click(first);
    expect(screen.getAllByRole("button", { name: /^第 \d+ 張，蓋著的牌$/ }).length).toBe(15);
  });

  it("switches grade", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "6 年級" }));
    expect(screen.getByRole("button", { name: "6 年級" })).toHaveAttribute("aria-pressed", "true");
  });
});
