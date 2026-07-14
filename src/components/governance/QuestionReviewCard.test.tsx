import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  QuestionReviewCard,
  type QuestionReviewQueueItem,
} from "./QuestionReviewCard";

const queueItem: QuestionReviewQueueItem = {
  id: "g4-yes-no-practice-01",
  version: 2,
  grade: 4,
  microSkill: "yes-no-questions",
  modality: "text",
  prompt: "Is this a kite?",
  audio: null,
  image: null,
  options: [
    { id: "yes", text: "Yes, it is." },
    { id: "no", text: "No, it isn't." },
  ],
  correctOptionId: "yes",
  explanation: "看到單數物品，要用 Yes, it is. 回答。",
  hints: ["先看問句開頭是不是 Is。"],
  source: {
    kind: "original",
    url: "https://example.edu/question-source",
    note: "英語英雄島原創題",
    usageRights: "original-for-project",
  },
  authorName: "內容編輯 A",
  changeSummary: "修正問句與解析",
  contentSha256: "a".repeat(64),
  contentHashSchema: "question-review-snapshot-pg-jsonb-text-v1",
  lockedAt: "2026-07-14T07:00:00.000Z",
};

describe("QuestionReviewCard", () => {
  afterEach(cleanup);

  it("shows the frozen version, answer, explanation, hints, and rights evidence", () => {
    render(<QuestionReviewCard item={queueItem} onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Is this a kite?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("第 2 版")).toBeInTheDocument();
    expect(screen.queryByText("目前 1／2 位複核通過")).not.toBeInTheDocument();
    expect(
      screen.getByText("獨立複核中：送出前不顯示其他教師的判斷"),
    ).toBeInTheDocument();
    expect(screen.getByText(/凍結時間/).closest("time")).toHaveAttribute(
      "datetime",
      queueItem.lockedAt,
    );
    expect(screen.getByText("正解：Yes, it is.")).toBeInTheDocument();
    expect(
      screen.getByText("看到單數物品，要用 Yes, it is. 回答。"),
    ).toBeInTheDocument();
    expect(screen.getByText("先看問句開頭是不是 Is。")).toBeInTheDocument();
    expect(screen.getByText("original-for-project")).toBeInTheDocument();
    expect(screen.getByText("修正問句與解析")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "開啟授權來源" })).toHaveAttribute(
      "href",
      "https://example.edu/question-source",
    );
  });

  it("shows playable audio, transcript, and image evidence before asset review", () => {
    const { rerender } = render(
      <QuestionReviewCard
        item={{
          ...queueItem,
          modality: "audio",
          audio: { src: "/audio/kite.mp3", transcript: "Is this a kite?" },
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("播放題目音訊")).toHaveAttribute(
      "src",
      "/audio/kite.mp3",
    );
    expect(screen.getByText("逐字稿：Is this a kite?")).toBeInTheDocument();

    rerender(
      <QuestionReviewCard
        item={{
          ...queueItem,
          modality: "image",
          image: { src: "/images/kite.webp", alt: "一隻風箏" },
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "一隻風箏" })).toHaveAttribute(
      "src",
      "/images/kite.webp",
    );
  });

  it("shows the exact frozen receipt before and during irreversible confirmation", () => {
    render(<QuestionReviewCard item={queueItem} onSubmit={vi.fn()} />);

    expect(screen.getByText(queueItem.contentSha256)).toBeInTheDocument();
    expect(screen.getByText(queueItem.contentHashSchema)).toBeInTheDocument();

    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }
    fireEvent.change(screen.getByLabelText("複核意見"), {
      target: { value: "內容正確" },
    });
    fireEvent.click(screen.getByRole("button", { name: "通過複核" }));

    const dialog = screen.getByRole("alertdialog", { name: "確認通過複核" });
    expect(within(dialog).getByText(queueItem.contentSha256)).toBeInTheDocument();
    expect(within(dialog).getByText(queueItem.contentHashSchema)).toBeInTheDocument();
  });

  it("requires all seven checks and a meaningful note before approving", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionReviewCard item={queueItem} onSubmit={onSubmit} />);

    const approveButton = screen.getByRole("button", { name: "通過複核" });
    expect(approveButton).toBeDisabled();

    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }
    fireEvent.change(screen.getByLabelText("複核意見"), {
      target: { value: "內容正確" },
    });
    expect(approveButton).toBeEnabled();
    expect(screen.getByRole("button", { name: "退回修正" })).toBeDisabled();

    fireEvent.click(approveButton);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "確認通過複核" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "確認送出通過複核" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      questionId: queueItem.id,
      questionVersion: queueItem.version,
      expectedContentSha256: queueItem.contentSha256,
      expectedContentHashSchema: queueItem.contentHashSchema,
      verdict: "approved",
      note: "內容正確",
      criteria: {
        english_correct: true,
        answer_unique: true,
        explanation_correct: true,
        hint_safe: true,
        asset_consistent: true,
        rights_clear: true,
        age_appropriate: true,
      },
    });
  });

  it("allows a detailed change request while preserving failed criteria", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuestionReviewCard item={queueItem} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "英文內容正確" }));
    fireEvent.change(screen.getByLabelText("複核意見"), {
      target: { value: "第二個選項可能也能成立，請補上圖片情境。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "退回修正" }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "確認送出退回修正" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: "changes_requested",
        note: "第二個選項可能也能成立，請補上圖片情境。",
        criteria: expect.objectContaining({
          english_correct: true,
          answer_unique: false,
        }),
      }),
    );
  });
});
