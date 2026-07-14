import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import { MemoryProgressStore } from "@/infrastructure/progress/MemoryProgressStore";
import { createEmptyProgress } from "@/infrastructure/progress/progress-types";
import { BattleSession } from "./BattleSession";

describe("BattleSession", () => {
  beforeEach(() => {
    cleanup();
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

  it("keeps shield feedback warm after a wrong first try and leads feedback with growth", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
      stage: "diagnostic",
      activeSession: {
        id: "shield-test",
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
    const user = userEvent.setup();

    render(
      <AdventureProvider store={store}>
        <BattleSession bank={pilotQuestionBank} onComplete={vi.fn()} />
      </AdventureProvider>,
    );

    await screen.findByText("Which lowercase letter matches G?");
    expect(screen.getByText("護盾 3／3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "q" }));
    expect(screen.getByText("護盾 2／3")).toBeInTheDocument();
    expect(screen.getByText(/護盾擋住了這一下/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/失敗|太慢|你不會|Game Over/i);

    await user.click(screen.getByRole("button", { name: "g" }));
    expect(
      screen.getByText("成長紀錄：救援後自己走完最後一步，方法已經留在你身上。"),
    ).toBeInTheDocument();
  });

  it("records a correct answer after revealing the text alternative as assisted learning", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
      stage: "battle",
      activeSession: {
        id: "audio-support-test",
        kind: "diagnostic",
        microSkill: null,
        questionIds: ["g3-diagnostic-letter-listening-01"],
        currentIndex: 0,
        phase: "diagnostic",
        hintsUsed: 0,
        selectedTool: null,
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

    await screen.findByText("Listen. Which letter do you hear?");
    expect(screen.queryByText("B", { selector: "p" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "顯示文字輔助" }));
    await user.click(screen.getByRole("button", { name: "B" }));

    expect(screen.getByText("線索有幫上忙：你已經把方法接起來了。")).toBeInTheDocument();
    await waitFor(async () => {
      expect((await store.load()).events[0]).toMatchObject({
        outcome: "assisted_correct",
        hintsUsed: 1,
      });
    });
  });

  it("turns word-bridge into a step-by-step clue instead of repeating the stored hint", async () => {
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

    expect(
      within(screen.getByRole("status", { name: "提示內容" })).getByText("拆字橋", {
        selector: "strong",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("把單字或句子拆成小段，一段一段接起來。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "步驟 1：先接 /m/ + /æ/。步驟 2：再接 /p/。完整連讀一次後，才和選項逐字比對。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("先慢慢連起 m-a，再接 p。")).not.toBeInTheDocument();
  });

  it("lets the learner switch among three substantively different hint scaffolds", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 3, heroId: "forest-keeper" },
      stage: "battle",
      activeSession: {
        id: "mission-tool-switch-test",
        kind: "mission",
        microSkill: "cvc-decoding",
        questionIds: ["g3-cvc-practice-01"],
        currentIndex: 0,
        phase: "practice",
        hintsUsed: 0,
        selectedTool: "word-bridge",
        selectedRoute: "steady-bridge",
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
    await user.click(screen.getByRole("button", { name: "使用提示工具" }));

    const hintCard = screen.getByRole("status", { name: "提示內容" });
    expect(hintCard).toHaveTextContent("步驟 1：先接 /m/ + /æ/");
    expect(hintCard).not.toHaveTextContent(/\bmap\b/i);

    await user.click(within(hintCard).getByRole("button", { name: "切換為聲音透鏡" }));
    expect(hintCard).toHaveTextContent(
      "只聽聲音：依序念 /m/ → /æ/ → /p/，先不要看完整單字；再逐一念選項，排除中間音或尾音不同的字。",
    );
    expect(hintCard).not.toHaveTextContent("步驟 1：先接 /m/ + /æ/");
    expect(hintCard).not.toHaveTextContent(/\bmap\b/i);

    await user.click(within(hintCard).getByRole("button", { name: "切換為例句卡" }));
    expect(hintCard).toHaveTextContent(
      "相似例：/s/ + /ɪ/ + /t/ 可以連成 sit。先照這個「首音＋中間音＋尾音」流程練一次，再回到本題。",
    );
    expect(hintCard).not.toHaveTextContent(/\bmap\b/i);
    await waitFor(async () => {
      expect((await store.load()).activeSession?.selectedTool).toBe("example-card");
    });
  });

  it("explains how the last selected strategy helped in the answer feedback", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 3, heroId: "forest-keeper" },
      stage: "battle",
      activeSession: {
        id: "mission-tool-feedback-test",
        kind: "mission",
        microSkill: "cvc-decoding",
        questionIds: ["g3-cvc-practice-01"],
        currentIndex: 0,
        phase: "practice",
        hintsUsed: 0,
        selectedTool: "word-bridge",
        selectedRoute: "steady-bridge",
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
    await user.click(screen.getByRole("button", { name: "使用提示工具" }));
    await user.click(screen.getByRole("button", { name: "切換為例句卡" }));
    await user.click(screen.getByRole("button", { name: "map" }));

    expect(screen.getByText("線索有幫上忙：你已經把方法接起來了。")).toBeInTheDocument();
    expect(
      screen.getByText(/你最後使用「例句卡」：先在不同例子練一次同樣規則，幫你把方法遷移回本題。/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/你最後使用「拆字橋」/)).not.toBeInTheDocument();
  });
});
