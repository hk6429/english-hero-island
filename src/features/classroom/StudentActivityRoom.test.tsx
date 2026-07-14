import type { SupabaseClient } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudentActivityRoom } from "./StudentActivityRoom";

describe("StudentActivityRoom", () => {
  it("moves from the safe waiting room to the shared mission after the teacher starts", async () => {
    const user = userEvent.setup();
    const client = {
      rpc: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            {
              activity_status: "waiting",
              activity_title: "Yes／No 快速救援",
              grade: 4,
              question_count: 5,
              contribution_count: 0,
              repaired_points: 0,
              boss_armor: 5,
              participant_state: "joined",
              answered_count: 0,
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              activity_status: "active",
              activity_title: "Yes／No 快速救援",
              grade: 4,
              question_count: 5,
              contribution_count: 2,
              repaired_points: 1,
              boss_armor: 4,
              participant_state: "in_progress",
              answered_count: 0,
            },
          ],
          error: null,
        }),
    } as unknown as SupabaseClient;

    render(
      <StudentActivityRoom
        activityId="33333333-3333-4333-8333-333333333333"
        client={client}
        participantId="44444444-4444-4444-8444-444444444444"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "等待老師啟動任務" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "再檢查一次" }));
    expect(
      await screen.findByRole("heading", { name: "全班合作關卡已啟動" }),
    ).toBeInTheDocument();
    expect(screen.getByText("全班已修復 1 格")).toBeInTheDocument();
  });

  it("restores a completed participant after reload without fetching answered questions", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          activity_status: "active",
          activity_title: "Yes／No 快速救援",
          grade: 4,
          question_count: 3,
          contribution_count: 8,
          repaired_points: 5,
          boss_armor: 0,
          participant_state: "may_need_help",
          answered_count: 3,
        },
      ],
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    render(
      <StudentActivityRoom
        activityId="33333333-3333-4333-8333-333333333333"
        client={client}
        participantId="44444444-4444-4444-8444-444444444444"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "你完成了這次合作貢獻" }),
    ).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      "get_student_activity_questions",
      expect.anything(),
    );
  });
});
