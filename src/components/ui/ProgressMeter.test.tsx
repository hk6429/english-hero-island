import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressMeter } from "./ProgressMeter";

describe("ProgressMeter", () => {
  it("exposes an accessible progressbar with name, range and value text", () => {
    render(<ProgressMeter label="診斷進度" value={3} max={8} />);

    const bar = screen.getByRole("progressbar", { name: "診斷進度" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "8");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuetext", "3／8");
  });

  it("clamps out-of-range values into 0..max", () => {
    render(<ProgressMeter label="Boss 護甲" value={12} max={8} tone="gold" />);

    const bar = screen.getByRole("progressbar", { name: "Boss 護甲" });
    expect(bar).toHaveAttribute("aria-valuenow", "8");
    expect(bar).toHaveClass("progress-gold");
  });

  it("stays safe when given non-finite numbers", () => {
    render(<ProgressMeter label="任務進度" value={Number.NaN} max={Number.NaN} />);

    const bar = screen.getByRole("progressbar", { name: "任務進度" });
    expect(bar).toHaveAttribute("aria-valuemax", "1");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });
});
