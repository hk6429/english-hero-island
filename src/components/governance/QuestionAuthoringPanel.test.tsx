import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  QuestionAuthoringPanel,
  type QuestionDraftInput,
} from "./QuestionAuthoringPanel";

const revisionDraft: QuestionDraftInput = {
  id: "g5-listening-direction-04",
  grade: 5,
  skill: "classroom_english",
  indicator: "能聽懂並回應課室指令",
  microSkill: "classroom-directions",
  difficulty: 2,
  modality: "audio",
  questionType: "listening_choice",
  purpose: "diagnostic",
  prompt: "What should you do?",
  audio: {
    src: "https://assets.example.edu/open-your-book.mp3",
    transcript: "Please open your book.",
  },
  options: [
    { id: "a", text: "Open my book." },
    { id: "b", text: "Close the door." },
    { id: "c", text: "Raise my hand." },
  ],
  correctOptionId: "a",
  explanation: "open your book 是打開課本。",
  hints: ["先聽動詞。", "open 表示打開。"],
  variantGroup: "g5-classroom-directions",
  source: {
    kind: "licensed",
    note: "校內教材授權改寫",
    usageRights: "school-license-2026",
  },
};

function fillRequiredBase() {
  fireEvent.change(screen.getByLabelText("題目識別碼"), {
    target: { value: "g4-yes-no-practice-11" },
  });
  fireEvent.change(screen.getByLabelText("年級"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("能力領域"), {
    target: { value: "grammar" },
  });
  fireEvent.change(screen.getByLabelText("能力指標"), {
    target: { value: "能使用 Yes／No 問句" },
  });
  fireEvent.change(screen.getByLabelText("微技能代碼"), {
    target: { value: "yes-no-questions" },
  });
  fireEvent.change(screen.getByLabelText("題目用途"), {
    target: { value: "practice" },
  });
  fireEvent.change(screen.getByLabelText("題幹"), {
    target: { value: "Is this a kite?" },
  });
  fireEvent.change(screen.getByLabelText("選項 A"), {
    target: { value: "Yes, it is." },
  });
  fireEvent.change(screen.getByLabelText("選項 B"), {
    target: { value: "No, it isn't." },
  });
  fireEvent.change(screen.getByLabelText("正解"), { target: { value: "a" } });
  fireEvent.change(screen.getByLabelText("解析"), {
    target: { value: "單數物品使用 Yes, it is. 回答。" },
  });
  fireEvent.change(screen.getByLabelText("第一層提示"), {
    target: { value: "先找問句開頭的 Is。" },
  });
  fireEvent.change(screen.getByLabelText("變式群組"), {
    target: { value: "g4-yes-no-object" },
  });
  fireEvent.change(screen.getByLabelText("來源說明"), {
    target: { value: "依能力指標原創" },
  });
}

describe("QuestionAuthoringPanel", () => {
  afterEach(cleanup);

  it("creates a complete original draft through the public callback", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      questionId: "g4-yes-no-practice-11",
      version: 1,
      status: "draft" as const,
    });
    render(<QuestionAuthoringPanel onCreate={onCreate} onImport={vi.fn()} />);

    fillRequiredBase();
    fireEvent.click(screen.getByRole("button", { name: "建立草稿" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith({
      id: "g4-yes-no-practice-11",
      grade: 4,
      skill: "grammar",
      indicator: "能使用 Yes／No 問句",
      microSkill: "yes-no-questions",
      difficulty: 1,
      modality: "text",
      questionType: "multiple_choice",
      purpose: "practice",
      prompt: "Is this a kite?",
      options: [
        { id: "a", text: "Yes, it is." },
        { id: "b", text: "No, it isn't." },
      ],
      correctOptionId: "a",
      explanation: "單數物品使用 Yes, it is. 回答。",
      hints: ["先找問句開頭的 Is。"],
      variantGroup: "g4-yes-no-object",
      source: {
        kind: "original",
        note: "依能力指標原創",
        usageRights: "original-for-project",
      },
    });
    expect(
      await screen.findByText("已建立 g4-yes-no-practice-11 第 1 版草稿。"),
    ).toBeInTheDocument();
  });

  it("requires and submits the frozen audio asset with its transcript", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      questionId: "g4-yes-no-practice-11",
      version: 1,
      status: "draft" as const,
    });
    render(<QuestionAuthoringPanel onCreate={onCreate} onImport={vi.fn()} />);
    fillRequiredBase();

    fireEvent.change(screen.getByLabelText("媒介"), {
      target: { value: "audio" },
    });
    fireEvent.change(screen.getByLabelText("音訊網址"), {
      target: { value: "https://assets.example.edu/kite.mp3" },
    });
    fireEvent.change(screen.getByLabelText("音訊逐字稿"), {
      target: { value: "Is this a kite?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立草稿" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        modality: "audio",
        questionType: "listening_choice",
        audio: {
          src: "https://assets.example.edu/kite.mp3",
          transcript: "Is this a kite?",
        },
      }),
    );
  });

  it("submits an optional source URL when the editor provides one", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      questionId: "g4-yes-no-practice-11",
      version: 1,
      status: "draft" as const,
    });
    render(<QuestionAuthoringPanel onCreate={onCreate} onImport={vi.fn()} />);
    fillRequiredBase();

    fireEvent.change(screen.getByLabelText("來源網址"), {
      target: { value: "https://curriculum.example.edu/yes-no-questions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立草稿" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: {
          kind: "original",
          note: "依能力指標原創",
          usageRights: "original-for-project",
          url: "https://curriculum.example.edu/yes-no-questions",
        },
      }),
    );
  });

  it("requires and submits an image with non-empty alternative text", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      questionId: "g4-yes-no-practice-11",
      version: 1,
      status: "draft" as const,
    });
    render(<QuestionAuthoringPanel onCreate={onCreate} onImport={vi.fn()} />);
    fillRequiredBase();

    fireEvent.change(screen.getByLabelText("媒介"), {
      target: { value: "image" },
    });
    fireEvent.change(screen.getByLabelText("圖片網址"), {
      target: { value: "https://assets.example.edu/kite.webp" },
    });
    fireEvent.change(screen.getByLabelText("圖片替代文字"), {
      target: { value: "天空中有一個風箏的情境圖" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立草稿" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        modality: "image",
        questionType: "image_choice",
        image: {
          src: "https://assets.example.edu/kite.webp",
          alt: "天空中有一個風箏的情境圖",
        },
      }),
    );
  });

  it("imports a JSON batch and reports success only after persistence completes", async () => {
    let finishImport: ((value: { importedCount: number }) => void) | undefined;
    const onImport = vi.fn().mockImplementation(
      () =>
        new Promise<{ importedCount: number }>((resolve) => {
          finishImport = resolve;
        }),
    );
    render(
      <QuestionAuthoringPanel onCreate={vi.fn()} onImport={onImport} />,
    );
    const rawJson = JSON.stringify([
      { questionId: "g3-letter-01", content: { grade: 3 } },
      { questionId: "g3-letter-02", content: { grade: 3 } },
    ]);

    fireEvent.change(screen.getByLabelText("題目 JSON 陣列"), {
      target: { value: rawJson },
    });
    fireEvent.click(screen.getByRole("button", { name: "驗證並匯入" }));

    expect(onImport).toHaveBeenCalledWith(rawJson);
    expect(screen.queryByText("已匯入 2 題草稿。" )).not.toBeInTheDocument();
    finishImport?.({ importedCount: 2 });
    expect(await screen.findByText("已匯入 2 題草稿。" )).toBeInTheDocument();
  });

  it("adds answer options up to the public question contract", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      questionId: "g4-yes-no-practice-11",
      version: 1,
      status: "draft" as const,
    });
    render(<QuestionAuthoringPanel onCreate={onCreate} onImport={vi.fn()} />);
    fillRequiredBase();

    fireEvent.click(screen.getByRole("button", { name: "新增選項" }));
    fireEvent.change(screen.getByLabelText("選項 C"), {
      target: { value: "It is a kite." },
    });
    fireEvent.change(screen.getByLabelText("正解"), { target: { value: "c" } });
    fireEvent.click(screen.getByRole("button", { name: "建立草稿" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { id: "a", text: "Yes, it is." },
          { id: "b", text: "No, it isn't." },
          { id: "c", text: "It is a kite." },
        ],
        correctOptionId: "c",
      }),
    );
  });

  it("prefills every editable field when creating a revision", () => {
    render(
      <QuestionAuthoringPanel
        initialDraft={revisionDraft}
        revisionContext={{
          questionId: revisionDraft.id,
          fromVersion: 2,
          onCreateRevision: vi.fn(),
        }}
      />,
    );

    expect(screen.getByLabelText("題目識別碼")).toHaveValue(revisionDraft.id);
    expect(screen.getByLabelText("年級")).toHaveValue("5");
    expect(screen.getByLabelText("能力領域")).toHaveValue("classroom_english");
    expect(screen.getByLabelText("能力指標")).toHaveValue(revisionDraft.indicator);
    expect(screen.getByLabelText("微技能代碼")).toHaveValue(revisionDraft.microSkill);
    expect(screen.getByLabelText("難度")).toHaveValue("2");
    expect(screen.getByLabelText("題目用途")).toHaveValue("diagnostic");
    expect(screen.getByLabelText("媒介")).toHaveValue("audio");
    expect(screen.getByLabelText("音訊網址")).toHaveValue(revisionDraft.audio?.src);
    expect(screen.getByLabelText("音訊逐字稿")).toHaveValue(
      revisionDraft.audio?.transcript,
    );
    expect(screen.getByLabelText("題幹")).toHaveValue(revisionDraft.prompt);
    expect(screen.getByLabelText("選項 A")).toHaveValue("Open my book.");
    expect(screen.getByLabelText("選項 B")).toHaveValue("Close the door.");
    expect(screen.getByLabelText("選項 C")).toHaveValue("Raise my hand.");
    expect(screen.getByLabelText("正解")).toHaveValue("a");
    expect(screen.getByLabelText("解析")).toHaveValue(revisionDraft.explanation);
    expect(screen.getByLabelText("第一層提示")).toHaveValue("先聽動詞。");
    expect(screen.getByLabelText("第 2 層提示")).toHaveValue("open 表示打開。");
    expect(screen.getByLabelText("變式群組")).toHaveValue(revisionDraft.variantGroup);
    expect(screen.getByLabelText("來源類型")).toHaveValue("licensed");
    expect(screen.getByLabelText("來源說明")).toHaveValue(revisionDraft.source.note);
    expect(screen.getByLabelText("使用權利")).toHaveValue(
      revisionDraft.source.usageRights,
    );
    expect(screen.queryByText("批次匯入草稿")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/作者/)).not.toBeInTheDocument();
  });

  it("rejects a revision whose change summary is outside the 4 to 500 character boundary", () => {
    const onCreateRevision = vi.fn();
    render(
      <QuestionAuthoringPanel
        initialDraft={revisionDraft}
        revisionContext={{
          questionId: revisionDraft.id,
          fromVersion: 2,
          onCreateRevision,
        }}
      />,
    );

    const summary = screen.getByLabelText("修改摘要");
    expect(summary).toBeRequired();
    expect(summary).toHaveAttribute("minlength", "4");
    expect(summary).toHaveAttribute("maxlength", "500");

    fireEvent.change(summary, { target: { value: "太短" } });
    fireEvent.submit(summary.closest("form")!);

    expect(onCreateRevision).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "修改摘要須為 4 至 500 字。",
    );
  });

  it("submits the revision context and edited draft before reporting server success", async () => {
    let finishRevision:
      | ((value: {
          questionId: string;
          version: number;
          status: "draft";
        }) => void)
      | undefined;
    const onCreateRevision = vi.fn().mockImplementation(
      () =>
        new Promise<{
          questionId: string;
          version: number;
          status: "draft";
        }>((resolve) => {
          finishRevision = resolve;
        }),
    );
    render(
      <QuestionAuthoringPanel
        initialDraft={revisionDraft}
        revisionContext={{
          questionId: revisionDraft.id,
          fromVersion: 2,
          onCreateRevision,
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("修改摘要"), {
      target: { value: "  修正指令提示與選項文字  " },
    });
    fireEvent.change(screen.getByLabelText("題幹"), {
      target: { value: "Which action should you take?" },
    });
    fireEvent.change(screen.getByLabelText("選項 C"), {
      target: { value: "Raise both hands." },
    });
    fireEvent.change(screen.getByLabelText("第 2 層提示"), {
      target: { value: "open 的相反詞是 close。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立新版" }));

    await waitFor(() => expect(onCreateRevision).toHaveBeenCalledTimes(1));
    expect(onCreateRevision).toHaveBeenCalledWith({
      questionId: revisionDraft.id,
      fromVersion: 2,
      changeSummary: "修正指令提示與選項文字",
      draft: {
        ...revisionDraft,
        prompt: "Which action should you take?",
        options: [
          { id: "a", text: "Open my book." },
          { id: "b", text: "Close the door." },
          { id: "c", text: "Raise both hands." },
        ],
        hints: ["先聽動詞。", "open 的相反詞是 close。"],
      },
    });
    expect(
      screen.queryByText(`已建立 ${revisionDraft.id} 第 3 版修訂草稿。`),
    ).not.toBeInTheDocument();

    finishRevision?.({
      questionId: revisionDraft.id,
      version: 3,
      status: "draft",
    });
    expect(
      await screen.findByText(`已建立 ${revisionDraft.id} 第 3 版修訂草稿。`),
    ).toBeInTheDocument();
  });

  it("preserves semantic option IDs and gives a new option a non-conflicting ID", async () => {
    const semanticIdDraft: QuestionDraftInput = {
      ...revisionDraft,
      id: "g5-classroom-response-yes-no",
      modality: "text",
      questionType: "multiple_choice",
      audio: undefined,
      options: [
        { id: "yes", text: "Yes, I should." },
        { id: "no", text: "No, I should not." },
      ],
      correctOptionId: "no",
    };
    const onCreateRevision = vi.fn().mockResolvedValue({
      questionId: semanticIdDraft.id,
      version: 5,
      status: "draft" as const,
    });
    render(
      <QuestionAuthoringPanel
        initialDraft={semanticIdDraft}
        revisionContext={{
          questionId: semanticIdDraft.id,
          fromVersion: 4,
          onCreateRevision,
        }}
      />,
    );

    expect(screen.getByLabelText("正解")).toHaveValue("no");
    fireEvent.change(screen.getByLabelText("修改摘要"), {
      target: { value: "新增一個干擾選項" },
    });
    fireEvent.click(screen.getByRole("button", { name: "新增選項" }));
    fireEvent.change(screen.getByLabelText("選項 C"), {
      target: { value: "Maybe later." },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立新版" }));

    await waitFor(() => expect(onCreateRevision).toHaveBeenCalledTimes(1));
    expect(onCreateRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          options: [
            { id: "yes", text: "Yes, I should." },
            { id: "no", text: "No, I should not." },
            { id: "a", text: "Maybe later." },
          ],
          correctOptionId: "no",
        }),
      }),
    );
  });

  it("prefills and preserves an existing source URL in a revision", async () => {
    const draftWithSourceUrl: QuestionDraftInput = {
      ...revisionDraft,
      source: {
        ...revisionDraft.source,
        url: "https://materials.example.edu/classroom-directions",
      },
    };
    const onCreateRevision = vi.fn().mockResolvedValue({
      questionId: draftWithSourceUrl.id,
      version: 3,
      status: "draft" as const,
    });
    render(
      <QuestionAuthoringPanel
        initialDraft={draftWithSourceUrl}
        revisionContext={{
          questionId: draftWithSourceUrl.id,
          fromVersion: 2,
          onCreateRevision,
        }}
      />,
    );

    expect(screen.getByLabelText("來源網址")).toHaveValue(
      draftWithSourceUrl.source.url,
    );
    fireEvent.change(screen.getByLabelText("修改摘要"), {
      target: { value: "保留授權來源資訊" },
    });
    fireEvent.click(screen.getByRole("button", { name: "建立新版" }));

    await waitFor(() => expect(onCreateRevision).toHaveBeenCalledTimes(1));
    expect(onCreateRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          source: draftWithSourceUrl.source,
        }),
      }),
    );
  });
});
