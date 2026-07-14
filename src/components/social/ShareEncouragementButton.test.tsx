import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareEncouragementButton } from "./ShareEncouragementButton";

describe("ShareEncouragementButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shares a privacy-safe encouragement card without nickname, score, or mistakes", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const user = userEvent.setup();

    render(<ShareEncouragementButton abilityLabel="CVC 拼讀" />);
    await user.click(screen.getByRole("button", { name: "分享鼓勵卡" }));

    expect(share).toHaveBeenCalledOnce();
    const payload = share.mock.calls[0][0] as { title: string; text: string };
    expect(payload.title).toBe("英語英雄島鼓勵卡");
    expect(payload.text).toContain("CVC 拼讀");
    expect(payload.text).toContain("送給一起學習的人");
    expect(payload.text).not.toMatch(/暱稱|XP|分數|錯題|排名|小浪/);
    expect(screen.getByText("鼓勵卡已交給分享面板，由你決定要傳給誰。")).toBeInTheDocument();
  });
});
