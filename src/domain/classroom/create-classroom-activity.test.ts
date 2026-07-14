import { describe, expect, it } from "vitest";
import { createClassroomActivity } from "./create-classroom-activity";

describe("createClassroomActivity", () => {
  it("prepares a short waiting-room activity with a six-character code and no ranking settings", () => {
    const result = createClassroomActivity(
      {
        teacherId: "11111111-1111-4111-8111-111111111111",
        classroomId: "22222222-2222-4222-8222-222222222222",
        title: "四年級 Yes／No 快速任務",
        grade: 4,
        microSkill: "yes-no-questions",
        questionCount: 5,
        audience: "whole_class",
        targetMemberIds: [],
      },
      {
        activityId: () => "33333333-3333-4333-8333-333333333333",
        joinCode: () => "A7K9Q2",
        now: () => new Date("2026-07-14T06:30:00.000Z"),
      },
    );

    expect(result).toEqual({
      ok: true,
      activity: {
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
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/rank|leaderboard|speed/i);
  });

  it("rejects a small-group activity without two distinct roster members", () => {
    const result = createClassroomActivity(
      {
        teacherId: "11111111-1111-4111-8111-111111111111",
        classroomId: "22222222-2222-4222-8222-222222222222",
        title: "小組救援",
        grade: 4,
        microSkill: "yes-no-questions",
        questionCount: 3,
        audience: "small_group",
        targetMemberIds: ["44444444-4444-4444-8444-444444444444"],
      },
      {
        activityId: () => "33333333-3333-4333-8333-333333333333",
        joinCode: () => "A7K9Q2",
        now: () => new Date("2026-07-14T06:30:00.000Z"),
      },
    );

    expect(result).toEqual({
      ok: false,
      reasons: ["small_group_requires_two_members"],
    });
  });
});
