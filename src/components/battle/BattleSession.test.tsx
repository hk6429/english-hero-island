import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { createEmptyProgress } from "@/infrastructure/progress/progress-types";
import { BattleSession } from "./BattleSession";

describe("BattleSession", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: () => "event-test-001" });
  });

  it("turns a first correct answer into visible learning and battle feedback", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
      stage: "diagnostic",
      activeSession: {
        id: "diagnostic-test",
        kind: "diagnostic",
        microSkill: null,
        questionIds: ["g3-diagnostic-uppercase-lowercase-01"],
        currentIndex: 0,
        phase: "diagnostic",
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 1, shields: 3, combo: 0, rescueActive: false },
        outcomes: [],
      },
    });
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(
      <AdventureProvider store={store}>
        <BattleSession bank={pilotQuestionBank} onComplete={onComplete} />
      </AdventureProvider>,
    );

    await screen.findByText("Which lowercase letter matches G?");
    await user.click(screen.getByRole("button", { name: "g" }));

    expect(screen.getByText("暴擊成功：這題是第一次獨立答對。")).toBeInTheDocument();
    expect((await store.load()).events).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "完成診斷" }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("shows the selected hint tool strategy alongside the question clue", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 3, heroId: "forest-keeper" },
      stage: "battle",
      activeSession: {
        id: "mission-tool-test",
        kind: "mission",
        microSkill: "cvc-decoding",
        questionIds: ["g3-cvc-practice-01"],
        currentIndex: 0,
        phase: "practice",
        hintsUsed: 0,
        selectedTool: "word-bridge",
        selectedRoute: "story-trail",
        battle: { armor: 1, shields: 3, combo: 0, rescueActive: false },
        outcomes: [],
      },
    });
    const user = userEvent.setup();

    render(
      <AdventureProvider store={store}>
        <BattleSession bank={pilotQuestionBank} onComplete={vi.fn()} />
      </AdventureProvider>,
    );

    await screen.findByText("Blend /m/ /æ/ /p/. Which word do you get?");
    expect(screen.getByText("探索徑・故事線索 1")).toBeInTheDocument();
    expect(screen.getByText(/兩條路使用相同題目、提示與 XP 規則/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "使用提示工具" }));

    expect(screen.getByText("拆字橋")).toBeInTheDocument();
    expect(
      screen.getByText("把單字或句子拆成小段，一段一段接起來。"),
    ).toBeInTheDocument();
    expect(screen.getByText("先慢慢連起 m-a，再接 p。")).toBeInTheDocument();
  });
});
