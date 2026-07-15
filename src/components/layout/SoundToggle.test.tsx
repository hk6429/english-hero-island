import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSoundEnabled } from "@/domain/audio/sound-settings";
import { SoundToggle } from "./SoundToggle";

describe("SoundToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("starts muted and lets the student turn sound on", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);

    const toggle = await screen.findByRole("button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(isSoundEnabled()).toBe(true);
  });

  it("persists turning sound back off", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);

    const toggle = await screen.findByRole("button");
    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(isSoundEnabled()).toBe(false);
  });
});
