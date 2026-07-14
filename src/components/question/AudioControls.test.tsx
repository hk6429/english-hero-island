import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioControls } from "./AudioControls";

describe("AudioControls", () => {
  afterEach(cleanup);

  it("reveals a readable text alternative only after the learner chooses support", async () => {
    const user = userEvent.setup();
    const onRevealTranscript = vi.fn();

    render(
      <AudioControls
        transcript="It is rainy today."
        onRevealTranscript={onRevealTranscript}
      />,
    );

    expect(screen.queryByText("It is rainy today.")).not.toBeInTheDocument();
    expect(onRevealTranscript).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "顯示文字輔助" }));

    expect(screen.getByText("It is rainy today.")).toBeInTheDocument();
    expect(screen.getByText("聽力內容文字版")).toBeInTheDocument();
    expect(onRevealTranscript).toHaveBeenCalledTimes(1);
  });

  it("warns before revealing text that the alternative may contain answer clues", () => {
    render(<AudioControls transcript="cat" />);

    expect(
      screen.getByText("無法使用聲音時再開啟；文字版可能包含作答線索。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("cat")).not.toBeInTheDocument();
  });

  it("groups both playback speeds under one labelled listening group", () => {
    render(<AudioControls transcript="cat" />);

    const listenGroup = screen.getByRole("group", { name: "播放聽力內容" });
    const { getByRole } = within(listenGroup);

    expect(getByRole("button", { name: "正常播放" })).toBeInTheDocument();
    expect(getByRole("button", { name: "慢速播放" })).toBeInTheDocument();
  });

  it("shows a visible text-support path when speech playback is unavailable", async () => {
    const user = userEvent.setup();
    Reflect.deleteProperty(window, "speechSynthesis");

    render(<AudioControls transcript="B" />);
    await user.click(screen.getByRole("button", { name: "正常播放" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "這個瀏覽器無法播放語音；請開啟文字輔助繼續作答。",
    );
    expect(screen.getByRole("button", { name: "顯示文字輔助" })).toBeEnabled();
  });
});
