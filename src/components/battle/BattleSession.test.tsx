import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { buildRescue } from "@/domain/session-builder/build-rescue";
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
      screen.getByText("成長紀錄：會挑線索、會用線索，這本身就是能力。"),
    ).toBeInTheDocument();
    await waitFor(async () => {
      expect((await store.load()).events[0]).toMatchObject({
        outcome: "assisted_correct",
        rescueVariantCorrect: false,
        toolUsed: "word-bridge",
      });
    });
    await waitFor(async () => {
      expect((await store.load()).activeSession?.battle.shields).toBe(3);
    });
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
    await waitFor(async () => {
      expect((await store.load()).events[0]).toMatchObject({
        outcome: "assisted_correct",
        toolUsed: "example-card",
      });
    });
  });

  it("runs the partner rescue teaching and rescue question when shields reach zero", async () => {
    const sessionId = "rescue-session-test";
    const rescueQuestion = buildRescue({
      grade: 3,
      microSkill: "cvc-decoding",
      bank: pilotQuestionBank,
      contentMode: "pilot",
      excludeQuestionIds: ["g3-cvc-practice-04"],
      seed: sessionId,
    });
    if (!rescueQuestion) throw new Error("rescue question missing from pilot bank");
    const wrongOption = rescueQuestion.options.find(
      (option) => option.id !== rescueQuestion.correctOptionId,
    );
    const correctOption = rescueQuestion.options.find(
      (option) => option.id === rescueQuestion.correctOptionId,
    );
    if (!wrongOption || !correctOption) throw new Error("rescue options missing");

    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小星", grade: 3, heroId: "star-smith" },
      stage: "battle",
      activeSession: {
        id: sessionId,
        kind: "mission",
        microSkill: "cvc-decoding",
        questionIds: ["g3-cvc-practice-04"],
        currentIndex: 0,
        phase: "practice",
        hintsUsed: 0,
        selectedTool: "word-bridge",
        selectedRoute: "steady-bridge",
        battle: { armor: 1, shields: 0, combo: 0, rescueActive: true },
        outcomes: ["pending_support"],
      },
    });
    const user = userEvent.setup();

    render(
      <AdventureProvider store={store}>
        <BattleSession bank={pilotQuestionBank} onComplete={vi.fn()} />
      </AdventureProvider>,
    );

    await screen.findByText("夥伴來了，陪你把方法接回來");
    expect(screen.getByText("夥伴救援教學")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/失敗|太慢|你不會|Game Over|倒數/i);

    await user.click(screen.getByRole("button", { name: /我準備好了，開始救援任務/ }));
    await screen.findByText(rescueQuestion.prompt);

    await user.click(screen.getByRole("button", { name: wrongOption.text }));
    expect(screen.getByText("換一個線索再試，夥伴就在旁邊陪你。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: wrongOption.text })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: correctOption.text }));
    expect(
      screen.getByText("夥伴協力成功：救援任務完成，專注護盾回到 1 格。"),
    ).toBeInTheDocument();

    await waitFor(async () => {
      const saved = await store.load();
      expect(saved.events).toHaveLength(1);
      expect(saved.events[0]).toMatchObject({
        outcome: "rescued",
        questionId: rescueQuestion.id,
        rescueVariantCorrect: true,
        toolUsed: "word-bridge",
      });
      expect(saved.activeSession?.battle).toMatchObject({
        shields: 1,
        rescueActive: false,
      });
      expect(saved.activeSession?.currentIndex).toBe(0);
    });

    await user.click(screen.getByRole("button", { name: /前往下一題/ }));
    await screen.findByText("Which word ends with /t/?");
    expect(screen.getByText("護盾 1／3")).toBeInTheDocument();
  });

  it("falls back to teaching-only rescue and restores one shield when no rescue question exists", async () => {
    const store = new MemoryProgressStore();
    await store.save({
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
      stage: "diagnostic",
      activeSession: {
        id: "rescue-fallback-test",
        kind: "diagnostic",
        microSkill: null,
        questionIds: ["g3-diagnostic-letter-writing-01"],
        currentIndex: 0,
        phase: "diagnostic",
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 1, shields: 0, combo: 0, rescueActive: true },
        outcomes: ["pending_support"],
      },
    });
    const user = userEvent.setup();

    render(
      <AdventureProvider store={store}>
        <BattleSession bank={pilotQuestionBank} onComplete={vi.fn()} />
      </AdventureProvider>,
    );

    await screen.findByText("夥伴來了，陪你把方法接回來");
    await user.click(screen.getByRole("button", { name: /把方法帶回挑戰/ }));

    await screen.findByText("Which capital letter is the correct match for b?");
    expect(screen.getByText("護盾 1／3")).toBeInTheDocument();
    await waitFor(async () => {
      const saved = await store.load();
      expect(saved.events).toHaveLength(0);
      expect(saved.activeSession?.battle).toMatchObject({
        shields: 1,
        rescueActive: false,
      });
    });
  });
});
