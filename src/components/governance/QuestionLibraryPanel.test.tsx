import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  QuestionLibraryPanel,
  type QuestionLibraryItem,
} from "./QuestionLibraryPanel";

const items: ReadonlyArray<QuestionLibraryItem> = [
  {
    id: "g4-yes-no-practice-01",
    version: 2,
    grade: 4,
    status: "reviewed",
    microSkill: "yes-no-questions",
    prompt: "Is this a kite?",
    audio: { src: "/audio/kite.mp3", transcript: "Is this a kite?" },
    image: { src: "/images/kite.webp", alt: "一隻風箏" },
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
  },
  {
    id: "g5-daily-routine-01",
    version: 1,
    grade: 5,
    status: "draft",
    microSkill: "daily-routines",
    prompt: "What time do you get up?",
    options: [
      { id: "a", text: "At seven." },
      { id: "b", text: "In the library." },
    ],
    correctOptionId: "a",
    explanation: "詢問時間要用時間回答。",
    hints: ["先找時間。"],
    source: {
      kind: "licensed",
      note: "合作教師改寫題",
      usageRights: "licensed-for-publication",
    },
  },
  {
    id: "g4-retired-01",
    version: 3,
    grade: 4,
    status: "retired",
    microSkill: "yes-no-questions",
    prompt: "Are these books?",
    options: [
      { id: "yes", text: "Yes, they are." },
      { id: "no", text: "No, they aren't." },
    ],
    correctOptionId: "no",
    explanation: "圖片中不是書。",
    hints: ["先看圖片中的物品。"],
    source: {
      kind: "original",
      note: "英語英雄島原創題",
      usageRights: "original-for-project",
    },
  },
  {
    id: "g6-published-01",
    version: 4,
    grade: 6,
    status: "published",
    microSkill: "past-tense",
    prompt: "What did Mia do yesterday?",
    options: [
      { id: "a", text: "She played basketball." },
      { id: "b", text: "She plays basketball." },
    ],
    correctOptionId: "a",
    explanation: "did 問句要用過去式語意回答。",
    hints: ["注意 yesterday。"],
    source: {
      kind: "original",
      note: "英語英雄島原創題",
      usageRights: "original-for-project",
    },
  },
];

describe("QuestionLibraryPanel", () => {
  afterEach(cleanup);

  it("previews the selected version together with its status and rights evidence", () => {
    render(<QuestionLibraryPanel items={items} onAction={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Is this a kite?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("第 2 版")).toBeInTheDocument();
    expect(screen.getByText("狀態：已複核")).toBeInTheDocument();
    expect(screen.getByText("來源：原創")).toBeInTheDocument();
    expect(
      screen.getByText("授權：original-for-project"),
    ).toBeInTheDocument();
    expect(screen.getByText("正解：Yes, it is.")).toBeInTheDocument();
    expect(screen.getByLabelText("播放預覽音訊")).toHaveAttribute(
      "src",
      "/audio/kite.mp3",
    );
    expect(screen.getByText("逐字稿：Is this a kite?")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "一隻風箏" })).toHaveAttribute(
      "src",
      "/images/kite.webp",
    );
    expect(screen.getByRole("link", { name: "開啟來源網址" })).toHaveAttribute(
      "href",
      "https://example.edu/question-source",
    );
  });

  it("searches and combines grade, status, and micro-skill filters", () => {
    render(<QuestionLibraryPanel items={items} onAction={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋題目" }), {
      target: { value: "daily" },
    });
    expect(screen.getByText("顯示 1／4 題")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What time do you get up?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /預覽 Is this a kite/ }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋題目" }), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "年級" }), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "版本狀態" }), {
      target: { value: "retired" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "微技能" }), {
      target: { value: "yes-no-questions" },
    });

    expect(screen.getByText("顯示 1／4 題")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Are these books?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /預覽 What time do you get up/ }),
    ).not.toBeInTheDocument();
  });

  it("emits governance intentions without fabricating a local status change", () => {
    const onAction = vi.fn();
    render(<QuestionLibraryPanel items={items} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "發布此版本" }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: "publish",
      questionId: "g4-yes-no-practice-01",
      questionVersion: 2,
    });
    expect(screen.getByText("狀態：已複核")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "建立新版" }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: "create_revision",
      questionId: "g4-yes-no-practice-01",
      questionVersion: 2,
    });

    fireEvent.click(screen.getByRole("button", { name: "回報爭議" }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: "dispute",
      questionId: "g4-yes-no-practice-01",
      questionVersion: 2,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /預覽 What time do you get up/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "送交複核" }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: "submit_for_review",
      questionId: "g5-daily-routine-01",
      questionVersion: 1,
    });
    expect(screen.getByText("狀態：草稿")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /預覽 What did Mia do yesterday/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "停用此版本" }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: "retire",
      questionId: "g6-published-01",
      questionVersion: 4,
    });
    expect(screen.getByText("狀態：已發布")).toBeInTheDocument();
  });

  it("hides administrator-only actions from content editors", () => {
    render(
      <QuestionLibraryPanel
        allowedActions={["submit_for_review", "create_revision"]}
        items={items}
        onAction={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "發布此版本" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "回報爭議" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "建立新版" })).toBeInTheDocument();
  });
});
