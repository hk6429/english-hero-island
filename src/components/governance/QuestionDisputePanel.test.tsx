import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionDisputePanel } from "./QuestionDisputePanel";

afterEach(cleanup);

describe("QuestionDisputePanel", () => {
  it("requires a deliberate confirmation before recording a published-question dispute", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuestionDisputePanel
        items={[
          {
            id: "g4-yes-no-practice-01",
            version: 2,
            prompt: "Is this a kite?",
          },
        ]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("爭議說明"), {
      target: { value: "音訊內容與題幹不一致" },
    });
    fireEvent.click(screen.getByRole("button", { name: "準備回報爭議" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "確認回報爭議" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "確認送出爭議" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        questionId: "g4-yes-no-practice-01",
        questionVersion: 2,
        note: "音訊內容與題幹不一致",
      }),
    );
    expect(
      screen.getByText("g4-yes-no-practice-01 第 2 版已標記為有爭議。"),
    ).toBeInTheDocument();
  });

  it("filters candidates by question id or prompt", () => {
    render(
      <QuestionDisputePanel
        items={[
          { id: "question-a", version: 1, prompt: "Is this a kite?" },
          { id: "question-b", version: 3, prompt: "Which one is a cat?" },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("搜尋已發布題目"), {
      target: { value: "cat" },
    });
    expect(screen.getByRole("option", { name: /question-b/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /question-a/ })).not.toBeInTheDocument();
  });
});
