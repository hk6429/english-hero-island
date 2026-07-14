import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreakGlow } from "./StreakGlow";

const makeStreak = (brightness: 0 | 1 | 2 | 3, completedDates: string[]) => ({
  brightness,
  completedDates,
});

describe("StreakGlow", () => {
  it("celebrates a steady glow at full brightness", () => {
    render(
      <StreakGlow
        streak={makeStreak(3, ["2026-07-10", "2026-07-11", "2026-07-12"])}
      />,
    );

    expect(screen.getByText("島嶼亮度 3／3")).toBeInTheDocument();
    expect(
      screen.getByText("光芒很穩定；休息不會讓已學會的能力消失。"),
    ).toBeInTheDocument();
  });

  it("frames a dimmed glow as recoverable, never as failure", () => {
    render(<StreakGlow streak={makeStreak(1, ["2026-07-10"])} />);

    expect(
      screen.getByText(/營火仍然保留著。有空再完成 2 個新的學習日，就會逐步回亮。/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/失敗|太慢|Game Over/)).not.toBeInTheDocument();
  });

  it("exposes an accessible summary of brightness and study days", () => {
    render(<StreakGlow streak={makeStreak(2, ["2026-07-10", "2026-07-11"])} />);

    expect(
      screen.getByLabelText("島嶼亮度 2 格，共完成 2 個學習日"),
    ).toBeInTheDocument();
  });
});
