import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { vocabByGrade } from "@/content/vocab-pairs";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import MatchPage from "./page";

function renderPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <MatchPage />
    </AdventureProvider>,
  );
}

describe("MatchPage", () => {
  afterEach(cleanup);

  it("shows an english column and a chinese column", () => {
    renderPage();
    expect(screen.getByText(/連對 0 \/ 6/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "英文" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "中文" })).toBeInTheDocument();
  });

  it("connects a correct english→chinese pick and advances progress", () => {
    renderPage();
    const enList = screen.getByRole("list", { name: "英文" });
    const zhList = screen.getByRole("list", { name: "中文" });

    const firstEnBtn = within(enList).getAllByRole("button")[0];
    const enWord = firstEnBtn.textContent!.trim();
    const zhGloss = vocabByGrade(3).find((p) => p.en === enWord)!.zh;

    fireEvent.click(firstEnBtn);
    const zhBtn = within(zhList)
      .getAllByRole("button")
      .find((b) => b.textContent!.includes(zhGloss))!;
    fireEvent.click(zhBtn);

    expect(screen.getByText(/連對 1 \/ 6/)).toBeInTheDocument();
  });
});
