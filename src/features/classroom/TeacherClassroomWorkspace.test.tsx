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
    expect(rpc).toHaveBeenCalledWith("list_teacher_classrooms");
    expect(rpc).toHaveBeenCalledWith("list_classroom_micro_skills", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});
