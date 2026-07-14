import type { SupabaseClient } from "@supabase/supabase-js";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherActivityLiveRoom } from "./TeacherActivityLiveRoom";

afterEach(cleanup);

describe("TeacherActivityLiveRoom", () => {
  it("refreshes the support panel after a participant realtime event", async () => {
    let realtimeCallback: (() => void) | undefined;
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ nickname: "小浪", participant_state: "joined" }],
        error: null,
      });
    const channel = {
      on: vi.fn().mockImplementation(
        (_event: string, _filter: unknown, callback: () => void) => {
          realtimeCallback = callback;
          return channel;
        },
      ),
      subscribe: vi.fn().mockReturnThis(),
    };
    const client = {
      rpc,
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    } as unknown as SupabaseClient;

    render(
      <TeacherActivityLiveRoom
        activityId="33333333-3333-4333-8333-333333333333"
        client={client}
        joinCode="A7K9Q2"
      />,
    );

    expect(await screen.findByText("活動碼 A7K9Q2")).toBeInTheDocument();
    expect(await screen.findByText("活動碼已準備好，等待第一位學生加入。")).toBeInTheDocument();

    await act(async () => {
      realtimeCallback?.();
    });

    expect(await screen.findByText("小浪")).toBeInTheDocument();
    expect(client.channel).toHaveBeenCalledWith(
      "classroom-activity-33333333-3333-4333-8333-333333333333",
    );
  });

  it("lets the owning teacher start and deliberately end the activity", async () => {
    const user = userEvent.setup();
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "start_classroom_activity") {
        return {
          data: [
            {
              activity_id: "33333333-3333-4333-8333-333333333333",
              activity_status: "active",
              started_at: "2026-07-14T07:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "end_classroom_activity") {
        return {
          data: [
            {
              activity_id: "33333333-3333-4333-8333-333333333333",
              activity_status: "ended",
              ended_at: "2026-07-14T07:30:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "close_classroom_activity_join") {
        return {
          data: [
            {
              activity_id: "33333333-3333-4333-8333-333333333333",
              activity_status: "active",
              join_closes_at: "2026-07-14T07:20:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "get_activity_learning_evidence") {
        return {
          data: [1, 2, 3].map((position) => ({
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_title: "Yes／No 快速救援",
            activity_status: "ended",
            audience: "whole_class",
            micro_skill: "yes-no-questions",
            question_count: 3,
            participant_count: 0,
            responding_participant_count: 0,
            completed_participant_count: 0,
            question_position: position,
            question_id: `g4-yes-no-practice-0${position}`,
            response_count: 0,
            independent_correct_count: 0,
            pending_support_count: 0,
          })),
          error: null,
        };
      }
      return { data: [], error: null };
    });
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    const client = {
      rpc,
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn().mockResolvedValue("ok"),
    } as unknown as SupabaseClient;

    render(
      <TeacherActivityLiveRoom
        activityId="33333333-3333-4333-8333-333333333333"
        client={client}
        joinCode="A7K9Q2"
      />,
    );

    await user.click(await screen.findByRole("button", { name: "啟動全班任務" }));

    expect(rpc).toHaveBeenCalledWith("start_classroom_activity", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(await screen.findByText("任務進行中")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "停止新加入" }));
    expect(rpc).toHaveBeenCalledWith("close_classroom_activity_join", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(await screen.findByText("新加入已關閉")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止新加入" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "結束活動" }));
    expect(
      screen.getByText("結束後學生不能再加入或送出新答案，已保存的學習事件不會刪除。"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "確認結束活動" }));

    expect(rpc).toHaveBeenCalledWith("end_classroom_activity", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(await screen.findByText("活動已結束")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "結束活動" })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "課後學習證據" }),
    ).toBeInTheDocument();
  });
});
