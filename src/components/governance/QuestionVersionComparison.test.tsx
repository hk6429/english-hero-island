import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  QuestionVersionComparison,
  type QuestionVersionSnapshot,
} from "./QuestionVersionComparison";

const before: QuestionVersionSnapshot = {
  questionId: "g4-yes-no-practice-01",
  version: 1,
  statusLabel: "已停用",
  fields: [
    { key: "prompt", label: "題幹", value: "Is this a pen?" },
    { key: "answer", label: "正解", value: "Yes, it is." },
    { key: "explanation", label: "解析", value: "用 Yes 回答。" },
    { key: "hints", label: "提示", value: ["先看 Is。"] },
    {
      key: "rights",
      label: "來源授權",
      value: "original-for-project",
    },
  ],
};

const after: QuestionVersionSnapshot = {
  questionId: "g4-yes-no-practice-01",
  version: 2,
  statusLabel: "已複核",
  changeSummary: "補足圖片情境與解析",
  fields: [
    { key: "prompt", label: "題幹", value: "Is this a kite?" },
    { key: "answer", label: "正解", value: "Yes, it is." },
    {
      key: "explanation",
      label: "解析",
      value: "看到單數物品，要用 Yes, it is. 回答。",
    },
    { key: "hints", label: "提示", value: ["先看 Is。"] },
    {
      key: "rights",
      label: "來源授權",
      value: "original-for-project",
    },
  ],
};

describe("QuestionVersionComparison", () => {
  afterEach(cleanup);

  it("shows every field before and after with a textual change verdict", () => {
    render(<QuestionVersionComparison after={after} before={before} />);

    expect(
      screen.getByRole("heading", { name: "g4-yes-no-practice-01 版本比較" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "第 1 版（修改前）" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "第 2 版（修改後）" }),
    ).toBeInTheDocument();
    expect(screen.getByText("本版修改：補足圖片情境與解析")).toBeInTheDocument();

    const promptRow = screen.getByRole("row", { name: /題幹/ });
    expect(within(promptRow).getByText("Is this a pen?")).toBeInTheDocument();
    expect(within(promptRow).getByText("Is this a kite?")).toBeInTheDocument();
    expect(within(promptRow).getByText("已變更")).toBeInTheDocument();

    const answerRow = screen.getByRole("row", { name: /正解/ });
    expect(within(answerRow).getAllByText("Yes, it is.")).toHaveLength(2);
    expect(within(answerRow).getByText("無變更")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(
      screen.getByRole("region", { name: "版本比較表格，可左右捲動" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("announces when every compared field is unchanged", () => {
    render(
      <QuestionVersionComparison
        after={{ ...before, version: 2, statusLabel: "草稿" }}
        before={before}
      />,
    );

    expect(screen.getByText("全部 5 個比較欄位皆無變更。")).toBeInTheDocument();
    expect(screen.getAllByText("無變更")).toHaveLength(5);
  });
});
