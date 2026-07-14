import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  prompt: "Is this a kite?",
  options: [
    { id: "yes", text: "Yes, it is." },
    { id: "no", text: "No, it isn't." },
  ],
  correctOptionId: "yes",
  explanation: "看到單數物品，要用 Yes, it is. 回答。",
  hints: ["先看問句開頭是不是 Is。"],
  source: {
    kind: "original",
    note: "英語英雄島原創題",
    usageRights: "original-for-project",
  },
  authorName: "內容編輯 A",
  changeSummary: "修正問句與解析",
  approvalCount: 1,
  changeRequestCount: 0,
};

describe("QuestionReviewCard", () => {
  afterEach(cleanup);

  it("shows the frozen version, answer, explanation, hints, and rights evidence", () => {
    render(<QuestionReviewCard item={queueItem} onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Is this a kite?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("第 2 版")).toBeInTheDocument();
    expect(screen.getByText("目前 1／2 位複核通過")).toBeInTheDocument();
    expect(screen.getByText("正解：Yes, it is.")).toBeInTheDocument();
    expect(
      screen.getByText("看到單數物品，要用 Yes, it is. 回答。"),
    ).toBeInTheDocument();
    expect(screen.getByText("先看問句開頭是不是 Is。")).toBeInTheDocument();
    expect(screen.getByText("original-for-project")).toBeInTheDocument();
    expect(screen.getByText("修正問句與解析")).toBeInTheDocument();
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

    fireEvent.click(approveButton);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      questionId: queueItem.id,
      questionVersion: queueItem.version,
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
