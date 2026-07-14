import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentJoinForm } from "./StudentJoinForm";

afterEach(cleanup);

describe("StudentJoinForm", () => {
  it("normalizes the six-character code and joins with an anonymous nickname", async () => {
    const user = userEvent.setup();
    const onJoined = vi.fn();
    const onJoin = vi.fn().mockResolvedValue({
      activityId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      activityTitle: "Yes／No 快速救援",
      grade: 4,
      participantState: "joined" as const,
    });

    render(<StudentJoinForm onJoin={onJoin} onJoined={onJoined} />);

    expect(screen.getByText("已輸入 0／6 碼")).toBeInTheDocument();
    expect(screen.getByText("下一步：輸入老師給的六碼活動代碼")).toBeInTheDocument();

    await user.type(screen.getByLabelText("六碼活動代碼"), "a7k9q2");
    expect(screen.getByText("六碼都到齊了！")).toBeInTheDocument();
    expect(screen.getByText("下一步：取一個匿名暱稱")).toBeInTheDocument();

    await user.type(screen.getByLabelText("匿名暱稱"), "小浪");
    expect(screen.queryByText(/^下一步：/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加入課堂任務" }));

    expect(onJoin).toHaveBeenCalledWith({
      joinCode: "A7K9Q2",
      nickname: "小浪",
      memberCode: "",
    });
    expect(onJoined).toHaveBeenCalledWith({
      activityId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      activityTitle: "Yes／No 快速救援",
      grade: 4,
      participantState: "joined",
    });
    expect(await screen.findByRole("heading", { name: "已加入 Yes／No 快速救援" })).toBeInTheDocument();
    expect(screen.getByText("等待老師啟動任務")).toBeInTheDocument();
    expect(screen.queryByLabelText(/真實姓名|電子郵件|生日/)).not.toBeInTheDocument();
  });

  it("normalizes an optional learner code for targeted activities", async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn().mockResolvedValue({
      activityId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      activityTitle: "小組快速救援",
      grade: 4,
      participantState: "joined" as const,
    });

    render(<StudentJoinForm onJoin={onJoin} />);

    await user.type(screen.getByLabelText("六碼活動代碼"), "a7k9q2");
    await user.type(screen.getByLabelText("匿名學習代碼（選填）"), "b7k9q2");
    await user.type(screen.getByLabelText("匿名暱稱"), "小浪");
    await user.click(screen.getByRole("button", { name: "加入課堂任務" }));

    expect(onJoin).toHaveBeenCalledWith({
      joinCode: "A7K9Q2",
      nickname: "小浪",
      memberCode: "B7K9Q2",
    });
  });
});
