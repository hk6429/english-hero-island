import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherQuickActivityForm } from "./TeacherQuickActivityForm";

afterEach(cleanup);

describe("TeacherQuickActivityForm", () => {
  it("creates a five-question whole-class activity and reveals only its share code", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({
      activityId: "33333333-3333-4333-8333-333333333333",
      joinCode: "A7K9Q2",
      joinClosesAt: "2026-07-15T06:30:00.000Z",
      activityStatus: "waiting" as const,
    });

    render(
      <TeacherQuickActivityForm
        classrooms={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            title: "四年一班",
            grade: 4,
          },
        ]}
        microSkills={[
          {
            id: "yes-no-questions",
            label: "Yes／No 問句",
            availableQuestions: 8,
          },
        ]}
        generateCode={() => "A7K9Q2"}
        onCreate={onCreate}
        onCreated={onCreated}
      />,
    );

    await user.clear(screen.getByLabelText("活動名稱"));
    await user.type(screen.getByLabelText("活動名稱"), "Yes／No 快速救援");
    await user.click(screen.getByRole("radio", { name: "5 題（約 5 分鐘）" }));
    await user.click(screen.getByRole("button", { name: "建立課堂任務" }));

    expect(onCreate).toHaveBeenCalledWith({
      classroomId: "22222222-2222-4222-8222-222222222222",
      title: "Yes／No 快速救援",
      microSkill: "yes-no-questions",
      questionCount: 5,
      audience: "whole_class",
      joinCode: "A7K9Q2",
      targetMemberIds: [],
    });
    expect(await screen.findByText("A7K9Q2")).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledWith({
      activityId: "33333333-3333-4333-8333-333333333333",
      joinCode: "A7K9Q2",
      joinClosesAt: "2026-07-15T06:30:00.000Z",
      activityStatus: "waiting",
    });
    expect(screen.getByText(/不公開個人成績、速度或排名/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/分數|速度|排名/)).not.toBeInTheDocument();
  });

  it("requires two real roster targets before creating a small-group activity", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue({
      activityId: "33333333-3333-4333-8333-333333333333",
      joinCode: "A7K9Q2",
      joinClosesAt: "2026-07-15T06:30:00.000Z",
      activityStatus: "waiting" as const,
    });

    render(
      <TeacherQuickActivityForm
        classrooms={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            title: "四年一班",
            grade: 4,
          },
        ]}
        generateCode={() => "A7K9Q2"}
        members={[
          {
            id: "44444444-4444-4444-8444-444444444444",
            code: "B7K9Q2",
            alias: "藍鯨 7 號",
            groupLabel: "海洋組",
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            code: "C8M4R6",
            alias: "海星 8 號",
            groupLabel: "海洋組",
          },
        ]}
        microSkills={[
          {
            id: "yes-no-questions",
            label: "Yes／No 問句",
            availableQuestions: 8,
          },
        ]}
        onCreate={onCreate}
      />,
    );

    await user.selectOptions(screen.getByLabelText("派給誰"), "small_group");
    expect(screen.getByRole("button", { name: "建立課堂任務" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /藍鯨 7 號/ }));
    await user.click(screen.getByRole("checkbox", { name: /海星 8 號/ }));
    await user.click(screen.getByRole("button", { name: "建立課堂任務" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: "small_group",
        targetMemberIds: [
          "44444444-4444-4444-8444-444444444444",
          "55555555-5555-4555-8555-555555555555",
        ],
      }),
    );
  });

  it("notifies the workspace when the teacher changes classrooms", async () => {
    const user = userEvent.setup();
    const onClassroomChange = vi.fn();

    const { container } = render(
      <TeacherQuickActivityForm
        classrooms={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            title: "四年一班",
            grade: 4,
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            title: "五年二班",
            grade: 5,
          },
        ]}
        microSkills={[
          {
            id: "yes-no-questions",
            label: "Yes／No 問句",
            availableQuestions: 8,
          },
        ]}
        onClassroomChange={onClassroomChange}
        onCreate={vi.fn()}
      />,
    );

    await user.selectOptions(
      within(container).getByLabelText("班級"),
      "55555555-5555-4555-8555-555555555555",
    );

    expect(onClassroomChange).toHaveBeenCalledWith(
      "55555555-5555-4555-8555-555555555555",
    );
  });
});
