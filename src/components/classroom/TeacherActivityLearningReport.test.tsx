import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherActivityLearningReport } from "./TeacherActivityLearningReport";

const activityId = "33333333-3333-4333-8333-333333333333";

function row(position: number, correct: number, assisted: number, support: number) {
  return {
    activity_id: activityId,
    activity_title: "Yes／No 快速救援",
    activity_status: "ended",
    audience: "whole_class",
    micro_skill: "yes-no-questions",
    question_count: 3,
    participant_count: 8,
    responding_participant_count: 8,
    completed_participant_count: 7,
    question_position: position,
    question_id: `g4-yes-no-practice-0${position}`,
    response_count: position === 3 ? 7 : 8,
    independent_correct_count: correct,
    assisted_correct_count: assisted,
    rescued_count: 0,
    pending_support_count: support,
  };
}

describe("TeacherActivityLearningReport", () => {
  afterEach(cleanup);

  it("shows anonymous evidence, a possible common weak point, and an actionable follow-up", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [row(1, 6, 1, 1), row(2, 4, 0, 4), row(3, 5, 1, 1)],
        error: null,
      }),
    } as unknown as SupabaseClient;

    render(
      <TeacherActivityLearningReport activityId={activityId} client={client} />,
    );

    expect(
      await screen.findByRole("heading", { name: "課後學習證據" }),
    ).toBeInTheDocument();
    expect(screen.getByText("可能的共通卡點")).toBeInTheDocument();
    expect(screen.getByText("作答覆蓋").closest("div")).toHaveTextContent("96%");
    expect(screen.getByText("獨立答對").closest("div")).toHaveTextContent("65%");
    expect(screen.getByText("提示後答對").closest("div")).toHaveTextContent("9%");
    expect(screen.getByText("救援後完成").closest("div")).toHaveTextContent("0%");
    expect(screen.getByText("需要支援").closest("div")).toHaveTextContent("26%");
    expect(
      screen.getByText("第 2 題：4／8 份曾使用或仍需要支援（50%）"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("先處理「Yes／No 問句」的共通卡點"),
    ).toBeInTheDocument();
    expect(screen.getByText(/隔日再用 1 題新情境確認/)).toBeInTheDocument();
    expect(screen.queryByText("小浪")).not.toBeInTheDocument();
  });

  it("labels sparse evidence instead of presenting it as a class weakness", async () => {
    const sparseRows = [1, 2, 3].map((position) => ({
      ...row(position, 1, 0, 1),
      participant_count: 2,
      responding_participant_count: 2,
      completed_participant_count: 2,
      response_count: 2,
      independent_correct_count: 1,
      pending_support_count: 1,
    }));
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: sparseRows, error: null }),
    } as unknown as SupabaseClient;

    render(
      <TeacherActivityLearningReport activityId={activityId} client={client} />,
    );

    expect(
      await screen.findByText("資料不足，暫不判定共通弱點"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "目前只有 2 位參與者；判讀共通弱點至少 5 位參與者才足夠。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("先補足證據，再決定補救")).toBeInTheDocument();
  });
});
