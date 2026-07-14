import { describe, expect, it } from "vitest";
import type { ClassroomActivity } from "./create-classroom-activity";
import { joinClassroomActivity } from "./join-classroom-activity";

const activity: ClassroomActivity = {
  id: "33333333-3333-4333-8333-333333333333",
  teacherId: "11111111-1111-4111-8111-111111111111",
  classroomId: "22222222-2222-4222-8222-222222222222",
  title: "四年級 Yes／No 快速任務",
  grade: 4,
  microSkill: "yes-no-questions",
  questionCount: 5,
  audience: "whole_class",
  targetMemberIds: [],
  joinCode: "A7K9Q2",
  status: "waiting",
  createdAt: "2026-07-14T06:30:00.000Z",
  joinClosesAt: "2026-07-15T06:30:00.000Z",
};

describe("joinClassroomActivity", () => {
  it("admits an anonymous student with a nickname and no score, speed, email, or rank", () => {
    const result = joinClassroomActivity(
      activity,
      {
        joinCode: " a7k9q2 ",
        nickname: "  小海星  ",
        anonymousUserId: "44444444-4444-4444-8444-444444444444",
        classroomMemberId: null,
      },
      {
        participantId: () => "55555555-5555-4555-8555-555555555555",
        now: () => new Date("2026-07-14T07:00:00.000Z"),
      },
    );

    expect(result).toEqual({
      ok: true,
      participant: {
        id: "55555555-5555-4555-8555-555555555555",
        activityId: activity.id,
        anonymousUserId: "44444444-4444-4444-8444-444444444444",
        nickname: "小海星",
        classroomMemberId: null,
        state: "joined",
        joinedAt: "2026-07-14T07:00:00.000Z",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/email|score|speed|rank|leaderboard/i);
  });

  it("rejects an anonymous member who is not targeted by an individual activity", () => {
    const result = joinClassroomActivity(
      {
        ...activity,
        audience: "individual",
        targetMemberIds: ["66666666-6666-4666-8666-666666666666"],
      },
      {
        joinCode: "A7K9Q2",
        nickname: "小海星",
        anonymousUserId: "44444444-4444-4444-8444-444444444444",
        classroomMemberId: "77777777-7777-4777-8777-777777777777",
      },
      {
        participantId: () => "55555555-5555-4555-8555-555555555555",
        now: () => new Date("2026-07-14T07:00:00.000Z"),
      },
    );

    expect(result).toEqual({ ok: false, reason: "not_targeted" });
  });
});
