import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherClassroomWorkspace } from "./TeacherClassroomWorkspace";

afterEach(cleanup);

describe("TeacherClassroomWorkspace", () => {
  it("does not pretend to create cross-device activities without a dedicated backend", () => {
    render(<TeacherClassroomWorkspace client={null} />);

    expect(
      screen.getByRole("heading", { name: "教師課堂後端尚未連線" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/不會產生無法跨裝置使用的假代碼/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "建立課堂任務" })).not.toBeInTheDocument();
  });

  it("loads only the signed-in teacher's classrooms and reviewed skills", async () => {
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "list_teacher_classrooms") {
        return {
          data: [
            {
              classroom_id: "22222222-2222-4222-8222-222222222222",
              classroom_title: "四年一班",
              grade: 4,
            },
          ],
          error: null,
        };
      }
      if (name === "list_teacher_activities") {
        return {
          data: [
            {
              activity_id: "33333333-3333-4333-8333-333333333333",
              activity_title: "Yes／No 快速救援",
              join_code: "A7K9Q2",
              activity_status: "active",
              join_closes_at: "2099-07-15T06:30:00.000Z",
              question_count: 5,
              audience: "whole_class",
              created_at: "2026-07-14T06:30:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "list_classroom_members") {
        return {
          data: [
            {
              member_id: "44444444-4444-4444-8444-444444444444",
              member_code: "B7K9Q2",
              display_alias: "藍鯨 7 號",
              group_label: "海洋組",
            },
          ],
          error: null,
        };
      }
      return {
        data: [{ micro_skill: "yes-no-questions", available_questions: 8 }],
        error: null,
      };
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { user: { id: "teacher-user", is_anonymous: false } },
          },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      rpc,
    } as unknown as SupabaseClient;

    render(<TeacherClassroomWorkspace client={client} />);

    expect(
      await screen.findByRole("heading", { name: "兩分鐘建立一場小任務" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "四年一班・4 年級" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Yes／No 問句（可用 8 題）" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "重新整理後，也能接回原來的課堂" }),
    ).toBeInTheDocument();
    expect(screen.getByText("活動碼 A7K9Q2")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "用學習代碼建立小組與個別指派" }),
    ).toBeInTheDocument();
    expect(screen.getByText("藍鯨 7 號")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("list_teacher_classrooms");
    expect(rpc).toHaveBeenCalledWith("list_classroom_micro_skills", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(rpc).toHaveBeenCalledWith("list_teacher_activities", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(rpc).toHaveBeenCalledWith("list_classroom_members", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("lets an approved teacher create the first classroom instead of showing a dead end", async () => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { user: { id: "teacher-user", is_anonymous: false } },
          },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as SupabaseClient;

    render(<TeacherClassroomWorkspace client={client} />);

    expect(
      await screen.findByRole("heading", { name: "先建立班級，再派安全任務" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "建立班級" })).toBeInTheDocument();
    expect(screen.queryByText("目前沒有可派任務的班級")).not.toBeInTheDocument();
  });
});
