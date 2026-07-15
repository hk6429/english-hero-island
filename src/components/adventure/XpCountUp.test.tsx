import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { XpCountUp } from "./XpCountUp";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("XpCountUp", () => {
  it("animates from the starting value up to the final value", async () => {
    let now = 0;
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      now += 1000;
      callback(now);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    render(<XpCountUp from={10} to={25} />);

    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows the final value immediately when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    render(<XpCountUp from={10} to={25} />);

    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows the final value when there is no gain to animate", () => {
    render(<XpCountUp from={40} to={40} />);

    expect(screen.getByText("40")).toBeInTheDocument();
  });
});
