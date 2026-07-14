import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MissionRadioGroup } from "./MissionRadioGroup";

const choices = [
  { id: "steady-bridge", label: "穩步橋" },
  { id: "story-trail", label: "探索徑" },
] as const;

function RouteChoiceHarness() {
  const [selectedId, setSelectedId] = useState<string>("steady-bridge");

  return (
    <MissionRadioGroup
      ariaLabel="練功路線"
      className="route-grid"
      options={choices}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderOption={(choice) => choice.label}
    />
  );
}

function UnselectedRouteChoiceHarness() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <MissionRadioGroup
      ariaLabel="練功路線"
      className="route-grid"
      options={choices}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderOption={(choice) => choice.label}
    />
  );
}

afterEach(cleanup);

describe("MissionRadioGroup", () => {
  it("尚未選取時只讓第一個選項進入 Tab 順序", () => {
    render(<UnselectedRouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    expect(steadyRoute).toHaveAttribute("aria-checked", "false");
    expect(steadyRoute).toHaveAttribute("tabindex", "0");
    expect(storyRoute).toHaveAttribute("aria-checked", "false");
    expect(storyRoute).toHaveAttribute("tabindex", "-1");
  });

  it("方向鍵會選取並聚焦下一個選項，同步 roving tabindex 與 aria-checked", async () => {
    const user = userEvent.setup();
    render(<RouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    expect(steadyRoute).toHaveAttribute("aria-checked", "true");
    expect(steadyRoute).toHaveAttribute("tabindex", "0");
    expect(storyRoute).toHaveAttribute("aria-checked", "false");
    expect(storyRoute).toHaveAttribute("tabindex", "-1");

    steadyRoute.focus();
    await user.keyboard("{ArrowRight}");

    expect(storyRoute).toHaveFocus();
    expect(storyRoute).toHaveAttribute("aria-checked", "true");
    expect(storyRoute).toHaveAttribute("tabindex", "0");
    expect(steadyRoute).toHaveAttribute("aria-checked", "false");
    expect(steadyRoute).toHaveAttribute("tabindex", "-1");
  });

  it("向左鍵在第一個選項會循環到最後一個選項", async () => {
    const user = userEvent.setup();
    render(<RouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    steadyRoute.focus();
    await user.keyboard("{ArrowLeft}");

    expect(storyRoute).toHaveFocus();
    expect(storyRoute).toHaveAttribute("aria-checked", "true");
    expect(storyRoute).toHaveAttribute("tabindex", "0");
  });

  it("上下方向鍵會在選項間切換並維持焦點與選取一致", async () => {
    const user = userEvent.setup();
    render(<RouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    steadyRoute.focus();
    await user.keyboard("{ArrowDown}");
    expect(storyRoute).toHaveFocus();
    expect(storyRoute).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowUp}");
    expect(steadyRoute).toHaveFocus();
    expect(steadyRoute).toHaveAttribute("aria-checked", "true");
  });

  it("End 與 Home 會分別選取最後及第一個選項", async () => {
    const user = userEvent.setup();
    render(<RouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    steadyRoute.focus();
    await user.keyboard("{End}");
    expect(storyRoute).toHaveFocus();
    expect(storyRoute).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(steadyRoute).toHaveFocus();
    expect(steadyRoute).toHaveAttribute("aria-checked", "true");
  });

  it("滑鼠點選仍會更新單選狀態與唯一的 Tab 停駐點", async () => {
    const user = userEvent.setup();
    render(<RouteChoiceHarness />);

    const steadyRoute = screen.getByRole("radio", { name: "穩步橋" });
    const storyRoute = screen.getByRole("radio", { name: "探索徑" });

    await user.click(storyRoute);

    expect(storyRoute).toHaveAttribute("aria-checked", "true");
    expect(storyRoute).toHaveAttribute("tabindex", "0");
    expect(steadyRoute).toHaveAttribute("aria-checked", "false");
    expect(steadyRoute).toHaveAttribute("tabindex", "-1");
  });
});
