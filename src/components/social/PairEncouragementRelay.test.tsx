import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PairEncouragementRelay } from "./PairEncouragementRelay";

describe("PairEncouragementRelay", () => {
  it("creates a real same-device handoff without asking who the partner is", async () => {
    const user = userEvent.setup();
    const onReceive = vi.fn();
    render(<PairEncouragementRelay onReceive={onReceive} />);

    await user.click(screen.getByRole("button", { name: "開啟同桌鼓勵接力" }));
    expect(screen.getByRole("heading", { name: "請把畫面交給身旁學伴" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/姓名|暱稱/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "我看見你有先自己想，再決定要不要用提示。" }),
    );
    await user.click(screen.getByRole("button", { name: "封好鼓勵卡，交還給英雄" }));

    expect(onReceive).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/我看見你有先自己想/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打開夥伴鼓勵" }));
    expect(screen.getByText("我看見你有先自己想，再決定要不要用提示。")).toBeInTheDocument();
  });
});
