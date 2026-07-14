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

  it("lets the owning teacher start the waiting activity", async () => {
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
  });
});
