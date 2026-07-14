import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import StartPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderStartPage() {
  return render(
    <AdventureProvider store={new MemoryProgressStore()}>
      <StartPage />
    </AdventureProvider>,
  );
}

describe("StartPage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(cleanup);

  it("keeps the student on the form with a gentle prompt when the nickname is empty", async () => {
    const user = userEvent.setup();
    renderStartPage();

    await user.click(await screen.findByRole("button", { name: /進入五題診斷戰/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("請先幫英雄取一個暱稱。");
    const nicknameInput = screen.getByLabelText(/英雄暱稱/);
    expect(nicknameInput).toHaveFocus();
    expect(nicknameInput).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("updates the live hero card preview as choices change", async () => {
    const user = userEvent.setup();
    renderStartPage();

    expect(await screen.findByText("還沒取名的英雄")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /小森/ }));
    await user.click(screen.getByRole("radio", { name: /珊瑚橘/ }));
    await user.type(screen.getByLabelText(/英雄暱稱/), "珊瑚豆");

    expect(screen.getByText("珊瑚豆")).toBeInTheDocument();
    expect(screen.getByText(/小森｜森林守護員・珊瑚橘光環/)).toBeInTheDocument();
  });

  it("creates the profile and moves on to the diagnostic", async () => {
    const user = userEvent.setup();
    renderStartPage();

    await user.type(await screen.findByLabelText(/英雄暱稱/), "小海星");
    await user.click(screen.getByRole("button", { name: /進入五題診斷戰/ }));

    expect(push).toHaveBeenCalledWith("/diagnostic");
  });
});
