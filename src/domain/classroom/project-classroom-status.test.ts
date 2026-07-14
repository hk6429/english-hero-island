import { describe, expect, it } from "vitest";
import type { ClassroomParticipant } from "./join-classroom-activity";
import { projectClassroomStatus } from "./project-classroom-status";

function participant(
  id: string,
  nickname: string,
  state: ClassroomParticipant["state"],
): ClassroomParticipant {
  return {
    id,
    activityId: "33333333-3333-4333-8333-333333333333",
    anonymousUserId: id,
    classroomMemberId: null,
    nickname,
    state,
    joinedAt: "2026-07-14T07:00:00.000Z",
  };
}

describe("projectClassroomStatus", () => {
  it("shows join and completion states without exposing speed, XP, scores, or ranks", () => {
    const status = projectClassroomStatus([
      participant("11111111-1111-4111-8111-111111111111", "海星", "joined"),
      participant("22222222-2222-4222-8222-222222222222", "小浪", "in_progress"),
      participant("33333333-3333-4333-8333-333333333333", "小森", "completed"),
      participant("44444444-4444-4444-8444-444444444444", "小光", "may_need_help"),
    ]);

    expect(status.counts).toEqual({
      joined: 1,
      inProgress: 1,
      completed: 1,
      mayNeedHelp: 1,
      total: 4,
    });
    expect(status.participants).toEqual([
      { nickname: "海星", state: "joined", label: "已加入" },
      { nickname: "小浪", state: "in_progress", label: "進行中" },
      { nickname: "小森", state: "completed", label: "已完成" },
      { nickname: "小光", state: "may_need_help", label: "可能需要協助" },
    ]);
    expect(JSON.stringify(status)).not.toMatch(/speed|xp|score|rank|leaderboard/i);
  });
});
