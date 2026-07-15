import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagnosticReveal } from "./DiagnosticReveal";

afterEach(cleanup);

describe("DiagnosticReveal", () => {
  it("顯示該年級的第一站與聚焦能力", () => {
    render(<DiagnosticReveal grade={3} onContinue={() => {}} />);

    expect(screen.getByText(/拼讀森林/)).toBeInTheDocument();
    expect(screen.getByText(/CVC 拼讀/)).toBeInTheDocument();
  });

  it("點前往能力島會呼叫 onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<DiagnosticReveal grade={5} onContinue={onContinue} />);

    await user.click(screen.getByRole("button", { name: "前往能力島" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("文案不出現對孩子的否定字眼", () => {
    const { container } = render(<DiagnosticReveal grade={6} onContinue={() => {}} />);

    const text = container.textContent ?? "";
    for (const banned of ["失敗", "太慢", "你不會", "Game Over"]) {
      expect(text).not.toContain(banned);
    }
  });
});
