import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeacherRecentActivities } from "./TeacherRecentActivities";

describe("TeacherRecentActivities", () => {
  it("lets the teacher reopen an active activity after a page reload", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TeacherRecentActivities
        activities={[
          {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Yes／No 快速救援",
            joinCode: "A7K9Q2",
            status: "active",
            joinClosesAt: "2099-07-15T06:30:00.000Z",
            questionCount: 5,
            audience: "whole_class",
            createdAt: "2026-07-14T06:30:00.000Z",
          },
        ]}
        onSelect={onSelect}
        selectedActivityId={null}
      />,
    );

    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("活動碼 A7K9Q2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "開啟Yes／No 快速救援" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "33333333-3333-4333-8333-333333333333",
        status: "active",
      }),
    );
  });
});
