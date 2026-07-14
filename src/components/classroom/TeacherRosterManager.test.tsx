import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherRosterManager } from "./TeacherRosterManager";

afterEach(cleanup);

describe("TeacherRosterManager", () => {
  it("creates and safely archives pseudonymous members without asking for real names", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      code: "B7K9Q2",
      alias: "藍鯨 7 號",
      groupLabel: "海洋組",
    });
    const onArchive = vi.fn().mockResolvedValue({
      memberId: "44444444-4444-4444-8444-444444444444",
      archivedAt: "2026-07-14T09:00:00.000Z",
    });

    render(
      <TeacherRosterManager
        classroomId="22222222-2222-4222-8222-222222222222"
        members={[
          {
            id: "44444444-4444-4444-8444-444444444444",
            code: "B7K9Q2",
            alias: "藍鯨 7 號",
            groupLabel: "海洋組",
          },
        ]}
        onArchive={onArchive}
        onChanged={onChanged}
        onCreate={onCreate}
      />,
    );

    expect(screen.queryByLabelText(/真實姓名|電子郵件|生日/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("匿名別名"), "海星 8 號");
    await user.type(screen.getByLabelText("學習代碼"), "c8m4r6");
    await user.type(screen.getByLabelText("小組名稱（選填）"), "海洋組");
    await user.click(screen.getByRole("button", { name: "新增匿名學生" }));

    expect(onCreate).toHaveBeenCalledWith({
      classroomId: "22222222-2222-4222-8222-222222222222",
      displayAlias: "海星 8 號",
      memberCode: "C8M4R6",
      groupLabel: "海洋組",
    });
    expect(onChanged).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "封存藍鯨 7 號" }));
    expect(onArchive).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "確認封存藍鯨 7 號" }));
    expect(onArchive).toHaveBeenCalledWith("44444444-4444-4444-8444-444444444444");
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});
