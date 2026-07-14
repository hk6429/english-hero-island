import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PairEncouragementRelay } from "./PairEncouragementRelay";

describe("PairEncouragementRelay", () => {
  it("records shared repair only after the next real learner chooses how to apply the strategy", async () => {
    const user = userEvent.setup();
    const onReceive = vi.fn();
    render(
      <PairEncouragementRelay
        strategyName="拆字橋"
        strategyMessage="把單字拆成小段，再一段一段接回來。"
        repairCount={2}
        onReceive={onReceive}
      />,
    );

    expect(screen.getByText("這台裝置已完成 2 次真人策略接力。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "封存我的方法，交給下一位" }));
    expect(screen.getByRole("heading", { name: "請把裝置交給下一位學伴" })).toBeInTheDocument();
    const trail = screen.getByRole("list", { name: "接力進度" });
    expect(within(trail).getByText("交給學伴")).toHaveAttribute("aria-current", "step");
    expect(within(trail).getByText("封存方法")).not.toHaveAttribute("aria-current");
    expect(screen.queryByLabelText(/姓名|暱稱/)).not.toBeInTheDocument();
    expect(screen.queryByText("把單字拆成小段，再一段一段接回來。")).not.toBeInTheDocument();
    expect(onReceive).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "我是下一位學伴，打開方法" }));
    expect(screen.getByRole("heading", { name: "拆字橋" })).toBeInTheDocument();
    expect(screen.getByText("把單字拆成小段，再一段一段接回來。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我會怎麼使用這個方法？" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "回傳我的用法，完成共同修復" })).toBeDisabled();
    expect(onReceive).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "下一題先把題目拆成兩個小步驟" }));
    await user.click(screen.getByRole("button", { name: "回傳我的用法，完成共同修復" }));
    expect(onReceive).toHaveBeenCalledWith(
      "拆字橋：把單字拆成小段，再一段一段接回來。",
      "下一題先把題目拆成兩個小步驟",
    );
    expect(onReceive).toHaveBeenCalledTimes(1);
    expect(screen.getByText("共同修復 +1")).toBeInTheDocument();
    expect(screen.getByText(/下一位學伴的回覆/)).toHaveTextContent(
      "下一題先把題目拆成兩個小步驟",
    );
  });
});
