import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { createEmptyProgress } from "@/infrastructure/progress/progress-types";
import StartPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderStartPage(store = new MemoryProgressStore()) {
  return render(
    <AdventureProvider store={store}>
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

  it("patches an existing hero without wiping progress or re-running the diagnostic", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout", accent: "ocean" },
      xp: 240,
      abilityCards: ["ability-cvc-decoding"],
    });
    const user = userEvent.setup();
    renderStartPage(store);

    expect(await screen.findByText("調整你的英雄設定")).toBeInTheDocument();
    const nicknameInput = screen.getByLabelText(/英雄暱稱/);
    await user.clear(nicknameInput);
    await user.type(nicknameInput, "小海星");
    await user.click(screen.getByRole("button", { name: /儲存設定，回到能力島/ }));

    expect(push).toHaveBeenCalledWith("/island");
    const saved = await store.load();
    expect(saved.profile?.nickname).toBe("小海星");
    expect(saved.xp).toBe(240);
    expect(saved.abilityCards).toEqual(["ability-cvc-decoding"]);
  });
});
