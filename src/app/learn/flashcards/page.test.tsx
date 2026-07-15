import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import FlashcardsPage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <FlashcardsPage />
    </AdventureProvider>,
  );
}

describe("FlashcardsPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("shows an english word, flips to reveal the chinese gloss", () => {
    renderPage();
    const card = screen.getByRole("button", { name: /英文單字/ });
    expect(card).toHaveTextContent(/[a-z]{2,}/);
    fireEvent.click(card);
    expect(screen.getByRole("button", { name: /答案/ })).toBeInTheDocument();
  });

  it("advances and persists progress when the learner marks a card known", () => {
    renderPage();
    expect(screen.getByText(/精熟 0 \//)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "我會了" }));
    // 標記「我會了」後應寫入 localStorage（第一盒→第二盒）
    const raw = window.localStorage.getItem("ehi.leitner.g3");
    expect(raw).toBeTruthy();
    const boxes = JSON.parse(raw as string) as Record<string, number>;
    expect(Object.values(boxes).some((box) => box === 2)).toBe(true);
  });

  it("lets the learner switch grade", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "5 年級" }));
    expect(screen.getByRole("button", { name: "5 年級" })).toHaveAttribute("aria-pressed", "true");
  });
});
