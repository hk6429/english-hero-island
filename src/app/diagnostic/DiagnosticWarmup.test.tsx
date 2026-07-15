import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagnosticWarmup } from "./DiagnosticWarmup";

afterEach(cleanup);

describe("DiagnosticWarmup", () => {
  it("只在點過示範選項後才顯示開始按鈕", async () => {
    const user = userEvent.setup();
    render(<DiagnosticWarmup onReady={() => {}} />);

    expect(screen.queryByRole("button", { name: "開始五題診斷戰" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /圓形/ }));

    expect(screen.getByRole("button", { name: "開始五題診斷戰" })).toBeInTheDocument();
  });

  it("點開始按鈕會呼叫 onReady", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(<DiagnosticWarmup onReady={onReady} />);

    await user.click(screen.getByRole("button", { name: /星星/ }));
    await user.click(screen.getByRole("button", { name: "開始五題診斷戰" }));

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("文案清楚說明這是不計分的暖身", () => {
    render(<DiagnosticWarmup onReady={() => {}} />);

    expect(screen.getByText(/暖身練習・不計分/)).toBeInTheDocument();
    expect(screen.getByText(/這不是診斷題/)).toBeInTheDocument();
  });
});
