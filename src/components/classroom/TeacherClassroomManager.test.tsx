import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeacherClassroomManager } from "./TeacherClassroomManager";

describe("TeacherClassroomManager", () => {
  it("creates a classroom and requires confirmation before archiving", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      title: "四年一班",
      grade: 4,
    });
    const onArchive = vi.fn().mockResolvedValue(undefined);
    const onChanged = vi.fn();

    render(
      <TeacherClassroomManager
        classrooms={[
          {
            id: "55555555-5555-4555-8555-555555555555",
            title: "五年二班",
            grade: 5,
          },
        ]}
        onArchive={onArchive}
        onChanged={onChanged}
        onCreate={onCreate}
      />,
    );

    await user.type(screen.getByLabelText("新班級名稱"), "四年一班");
    await user.selectOptions(screen.getByLabelText("新班級年級"), "4");
    await user.click(screen.getByRole("button", { name: "建立班級" }));

    expect(onCreate).toHaveBeenCalledWith({ title: "四年一班", grade: 4 });
    expect(await screen.findByText("四年一班已建立")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "封存五年二班" }));
    expect(onArchive).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "確認封存五年二班" }));

    expect(onArchive).toHaveBeenCalledWith("55555555-5555-4555-8555-555555555555");
    expect(await screen.findByText("五年二班已封存")).toBeInTheDocument();
  });
});
