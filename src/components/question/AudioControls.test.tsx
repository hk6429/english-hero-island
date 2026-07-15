import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioControls } from "./AudioControls";

type FakeUtterance = {
  text: string;
  lang: string;
  rate: number;
  voice: unknown;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function stubSpeechSynthesis(onSpeak: (utterance: FakeUtterance) => void) {
  class StubUtterance implements FakeUtterance {
    text: string;
    lang = "";
    rate = 1;
    voice: unknown = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", StubUtterance);
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    getVoices: () => [],
    speak: (utterance: FakeUtterance) => onSpeak(utterance),
  });
}

describe("AudioControls", () => {
  afterEach(cleanup);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("confirms playback only once it actually starts, not just on click", async () => {
    const user = userEvent.setup();
    stubSpeechSynthesis(() => undefined);

    render(<AudioControls transcript="cat" />);
    await user.click(screen.getByRole("button", { name: "正常播放" }));

    expect(screen.getByRole("status")).toHaveTextContent("正在準備播放");
  });

  it("tells the learner directly when the browser reports a playback error", async () => {
    const user = userEvent.setup();
    stubSpeechSynthesis((utterance) => utterance.onerror?.());

    render(<AudioControls transcript="cat" />);
    await user.click(screen.getByRole("button", { name: "正常播放" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "這次沒有成功發出聲音，建議打開文字輔助繼續作答。",
    );
  });

  it("warns about a silent failure when no start/end/error event ever fires", () => {
    vi.useFakeTimers();
    stubSpeechSynthesis(() => undefined);

    render(<AudioControls transcript="cat" />);
    fireEvent.click(screen.getByRole("button", { name: "正常播放" }));

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "好像沒有聲音播出來，建議打開文字輔助繼續作答。",
    );
    vi.useRealTimers();
  });

  it("does not warn about silence once playback genuinely starts before the timeout", () => {
    vi.useFakeTimers();
    stubSpeechSynthesis((utterance) => utterance.onstart?.());

    render(<AudioControls transcript="cat" />);
    fireEvent.click(screen.getByRole("button", { name: "正常播放" }));

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByRole("status")).toHaveTextContent("正在正常速度播放");
    vi.useRealTimers();
  });
});
