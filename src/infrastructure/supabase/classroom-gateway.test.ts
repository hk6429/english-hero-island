import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createClassroomActivityWithSupabase,
  closeClassroomJoinWithSupabase,
  createTeacherClassroomWithSupabase,
  createClassroomMemberWithSupabase,
  endClassroomActivityWithSupabase,
  getActivityLearningEvidenceWithSupabase,
  getStudentActivityStateWithSupabase,
  getStudentActivityQuestionsWithSupabase,
  joinClassroomWithSupabase,
  listActivityParticipantStatusWithSupabase,
  listClassroomMicroSkillsWithSupabase,
  listClassroomMembersWithSupabase,
  listTeacherClassroomsWithSupabase,
  listTeacherActivitiesWithSupabase,
  startClassroomActivityWithSupabase,
  submitClassroomResponseWithSupabase,
  archiveTeacherClassroomWithSupabase,
  archiveClassroomMemberWithSupabase,
} from "./classroom-gateway";

describe("joinClassroomWithSupabase", () => {
  it("establishes an anonymous session before calling the protected join RPC", async () => {
    const callOrder: string[] = [];
    const client = {
      auth: {
        getSession: vi.fn().mockImplementation(async () => {
          callOrder.push("session");
          return { data: { session: null }, error: null };
        }),
        signInAnonymously: vi.fn().mockImplementation(async () => {
          callOrder.push("anonymous-auth");
          return {
            data: { user: { id: "anonymous-user", is_anonymous: true }, session: {} },
            error: null,
          };
        }),
      },
      rpc: vi.fn().mockImplementation(async () => {
        callOrder.push("join-rpc");
        return {
          data: [
            {
              activity_id: "33333333-3333-4333-8333-333333333333",
              participant_id: "44444444-4444-4444-8444-444444444444",
              activity_title: "Yes／No 快速救援",
              grade: 4,
              participant_state: "joined",
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    const result = await joinClassroomWithSupabase(client, {
      joinCode: "A7K9Q2",
      nickname: "小浪",
      memberCode: "",
    });

    expect(callOrder).toEqual(["session", "anonymous-auth", "join-rpc"]);
    expect(client.rpc).toHaveBeenCalledWith("join_classroom_activity", {
      p_join_code: "A7K9Q2",
      p_nickname: "小浪",
      p_member_code: null,
    });
    expect(result).toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      activityTitle: "Yes／No 快速救援",
      grade: 4,
      participantState: "joined",
    });
  });
});

describe("createClassroomActivityWithSupabase", () => {
  it("maps the quick form request to the protected creation RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            join_code: "A7K9Q2",
            join_closes_at: "2026-07-15T06:30:00.000Z",
            activity_status: "waiting",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await createClassroomActivityWithSupabase(client, {
      classroomId: "22222222-2222-4222-8222-222222222222",
      title: "Yes／No 快速救援",
      microSkill: "yes-no-questions",
      questionCount: 5,
      audience: "whole_class",
      joinCode: "A7K9Q2",
      targetMemberIds: [],
    });

    expect(client.rpc).toHaveBeenCalledWith("create_classroom_activity", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
      p_title: "Yes／No 快速救援",
      p_micro_skill: "yes-no-questions",
      p_question_count: 5,
      p_audience: "whole_class",
      p_join_code: "A7K9Q2",
      p_target_member_ids: [],
    });
    expect(result).toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      joinCode: "A7K9Q2",
      joinClosesAt: "2026-07-15T06:30:00.000Z",
      activityStatus: "waiting",
    });
  });

  it("rejects a decorative small-group label without real target members", async () => {
    const client = { rpc: vi.fn() } as unknown as SupabaseClient;

    await expect(
      createClassroomActivityWithSupabase(client, {
        classroomId: "22222222-2222-4222-8222-222222222222",
        title: "小組救援",
        microSkill: "yes-no-questions",
        questionCount: 3,
        audience: "small_group",
        joinCode: "A7K9Q2",
        targetMemberIds: ["44444444-4444-4444-8444-444444444444"],
      }),
    ).rejects.toThrow("小組任務至少要選 2 位匿名學生");
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe("classroom roster gateway", () => {
  it("lists, creates, and archives only pseudonymous classroom members", async () => {
    const client = {
      rpc: vi.fn().mockImplementation(async (name: string) => {
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
        if (name === "create_classroom_member") {
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
          data: [
            {
              member_id: "44444444-4444-4444-8444-444444444444",
              archived_at: "2026-07-14T09:00:00.000Z",
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(
      listClassroomMembersWithSupabase(
        client,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toEqual([
      {
        id: "44444444-4444-4444-8444-444444444444",
        code: "B7K9Q2",
        alias: "藍鯨 7 號",
        groupLabel: "海洋組",
      },
    ]);

    await expect(
      createClassroomMemberWithSupabase(client, {
        classroomId: "22222222-2222-4222-8222-222222222222",
        displayAlias: " 藍鯨 7 號 ",
        memberCode: " b7k9q2 ",
        groupLabel: " 海洋組 ",
      }),
    ).resolves.toEqual({
      id: "44444444-4444-4444-8444-444444444444",
      code: "B7K9Q2",
      alias: "藍鯨 7 號",
      groupLabel: "海洋組",
    });
    expect(client.rpc).toHaveBeenCalledWith("create_classroom_member", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
      p_display_alias: "藍鯨 7 號",
      p_member_code: "B7K9Q2",
      p_group_label: "海洋組",
    });

    await expect(
      archiveClassroomMemberWithSupabase(
        client,
        "44444444-4444-4444-8444-444444444444",
      ),
    ).resolves.toEqual({
      memberId: "44444444-4444-4444-8444-444444444444",
      archivedAt: "2026-07-14T09:00:00.000Z",
    });
  });
});

describe("listTeacherClassroomsWithSupabase", () => {
  it("maps the protected classroom list without exposing teacher identifiers", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            classroom_id: "22222222-2222-4222-8222-222222222222",
            classroom_title: "四年一班",
            grade: 4,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(listTeacherClassroomsWithSupabase(client)).resolves.toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "四年一班",
        grade: 4,
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_teacher_classrooms");
  });
});

describe("teacher classroom management", () => {
  it("creates and archives classrooms through approved-teacher RPCs", async () => {
    const client = {
      rpc: vi.fn().mockImplementation(async (name: string) => {
        if (name === "create_teacher_classroom") {
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
          data: [
            {
              classroom_id: "22222222-2222-4222-8222-222222222222",
              archived_at: "2026-07-14T08:00:00.000Z",
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(
      createTeacherClassroomWithSupabase(client, { title: " 四年一班 ", grade: 4 }),
    ).resolves.toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      title: "四年一班",
      grade: 4,
    });
    expect(client.rpc).toHaveBeenCalledWith("create_teacher_classroom", {
      p_title: "四年一班",
      p_grade: 4,
    });

    await expect(
      archiveTeacherClassroomWithSupabase(
        client,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toEqual({
      classroomId: "22222222-2222-4222-8222-222222222222",
      archivedAt: "2026-07-14T08:00:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("archive_teacher_classroom", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});

describe("listTeacherActivitiesWithSupabase", () => {
  it("returns recent owned activities so lifecycle controls survive a reload", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_title: "Yes／No 快速救援",
            join_code: "A7K9Q2",
            activity_status: "active",
            join_closes_at: "2026-07-15T06:30:00.000Z",
            question_count: 5,
            audience: "whole_class",
            created_at: "2026-07-14T06:30:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      listTeacherActivitiesWithSupabase(
        client,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toEqual([
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Yes／No 快速救援",
        joinCode: "A7K9Q2",
        status: "active",
        joinClosesAt: "2026-07-15T06:30:00.000Z",
        questionCount: 5,
        audience: "whole_class",
        createdAt: "2026-07-14T06:30:00.000Z",
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_teacher_activities", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});

describe("listClassroomMicroSkillsWithSupabase", () => {
  it("returns only the reviewed-question counts exposed by the protected RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ micro_skill: "yes-no-questions", available_questions: 8 }],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      listClassroomMicroSkillsWithSupabase(
        client,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toEqual([
      {
        id: "yes-no-questions",
        label: "Yes／No 問句",
        availableQuestions: 8,
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_classroom_micro_skills", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});

describe("listActivityParticipantStatusWithSupabase", () => {
  it("maps only nickname and support state for the teacher live panel", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          { nickname: "小浪", participant_state: "joined" },
          { nickname: "藍鯨", participant_state: "may_need_help" },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      listActivityParticipantStatusWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual([
      { nickname: "小浪", state: "joined" },
      { nickname: "藍鯨", state: "may_need_help" },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_activity_participant_status", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("getActivityLearningEvidenceWithSupabase", () => {
  it("maps only anonymous activity aggregates for the post-class report", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_title: "Yes／No 快速救援",
            activity_status: "ended",
            audience: "whole_class",
            micro_skill: "yes-no-questions",
            question_count: 3,
            participant_count: 8,
            responding_participant_count: 8,
            completed_participant_count: 7,
            question_position: 1,
            question_id: "g4-yes-no-practice-01",
            response_count: 8,
            independent_correct_count: 7,
            pending_support_count: 1,
          },
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_title: "Yes／No 快速救援",
            activity_status: "ended",
            audience: "whole_class",
            micro_skill: "yes-no-questions",
            question_count: 3,
            participant_count: 8,
            responding_participant_count: 8,
            completed_participant_count: 7,
            question_position: 2,
            question_id: "g4-yes-no-practice-02",
            response_count: 8,
            independent_correct_count: 4,
            pending_support_count: 4,
          },
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_title: "Yes／No 快速救援",
            activity_status: "ended",
            audience: "whole_class",
            micro_skill: "yes-no-questions",
            question_count: 3,
            participant_count: 8,
            responding_participant_count: 8,
            completed_participant_count: 7,
            question_position: 3,
            question_id: "g4-yes-no-practice-03",
            response_count: 7,
            independent_correct_count: 6,
            pending_support_count: 1,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      getActivityLearningEvidenceWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      title: "Yes／No 快速救援",
      status: "ended",
      audience: "whole_class",
      microSkill: "yes-no-questions",
      questionCount: 3,
      participantCount: 8,
      respondingParticipantCount: 8,
      completedParticipantCount: 7,
      questions: [
        {
          position: 1,
          questionId: "g4-yes-no-practice-01",
          responseCount: 8,
          independentCorrectCount: 7,
          pendingSupportCount: 1,
        },
        {
          position: 2,
          questionId: "g4-yes-no-practice-02",
          responseCount: 8,
          independentCorrectCount: 4,
          pendingSupportCount: 4,
        },
        {
          position: 3,
          questionId: "g4-yes-no-practice-03",
          responseCount: 7,
          independentCorrectCount: 6,
          pendingSupportCount: 1,
        },
      ],
    });
    expect(client.rpc).toHaveBeenCalledWith("get_activity_learning_evidence", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("startClassroomActivityWithSupabase", () => {
  it("activates the teacher-owned activity through the protected RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_status: "active",
            started_at: "2026-07-14T07:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      startClassroomActivityWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      activityStatus: "active",
      startedAt: "2026-07-14T07:00:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("start_classroom_activity", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("endClassroomActivityWithSupabase", () => {
  it("ends an owned waiting or active activity through its lifecycle RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_status: "ended",
            ended_at: "2026-07-14T07:30:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      endClassroomActivityWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      activityStatus: "ended",
      endedAt: "2026-07-14T07:30:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("end_classroom_activity", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("closeClassroomJoinWithSupabase", () => {
  it("revokes new joins without ending the active learning session", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_id: "33333333-3333-4333-8333-333333333333",
            activity_status: "active",
            join_closes_at: "2026-07-14T07:20:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      closeClassroomJoinWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      activityStatus: "active",
      joinClosesAt: "2026-07-14T07:20:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("close_classroom_activity_join", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("getStudentActivityStateWithSupabase", () => {
  it("maps only the safe shared story state for the joined participant", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            activity_status: "active",
            activity_title: "Yes／No 快速救援",
            grade: 4,
            question_count: 5,
            contribution_count: 7,
            repaired_points: 4,
            boss_armor: 3,
            participant_state: "in_progress",
            answered_count: 2,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      getStudentActivityStateWithSupabase(
        client,
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toEqual({
      activityStatus: "active",
      activityTitle: "Yes／No 快速救援",
      grade: 4,
      questionCount: 5,
      contributionCount: 7,
      repairedPoints: 4,
      bossArmor: 3,
      participantState: "in_progress",
      answeredCount: 2,
    });
    expect(client.rpc).toHaveBeenCalledWith("get_student_activity_state", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
    });
  });
});

describe("getStudentActivityQuestionsWithSupabase", () => {
  it("maps the answer-free question payload in activity order", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            position: 1,
            question_id: "g4-yes-no-practice-01",
            question_version: 1,
            grade: 4,
            micro_skill: "yes-no-questions",
            purpose: "practice",
            modality: "text",
            question_type: "multiple_choice",
            prompt: "Is this a pen?",
            options: [
              { id: "a", text: "Yes, it is." },
              { id: "b", text: "Yes, I am." },
            ],
            audio_src: null,
            image_src: null,
            image_alt: null,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await getStudentActivityQuestionsWithSupabase(
      client,
      "33333333-3333-4333-8333-333333333333",
    );

    expect(result).toEqual([
      {
        position: 1,
        id: "g4-yes-no-practice-01",
        version: 1,
        grade: 4,
        microSkill: "yes-no-questions",
        purpose: "practice",
        modality: "text",
        questionType: "multiple_choice",
        prompt: "Is this a pen?",
        options: [
          { id: "a", text: "Yes, it is." },
          { id: "b", text: "Yes, I am." },
        ],
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/correct|explanation|hint|review/i);
  });
});

describe("submitClassroomResponseWithSupabase", () => {
  it("sends only the selected option and maps post-response feedback", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            submitted_response_id: "66666666-6666-4666-8666-666666666666",
            learning_outcome: "independent_correct",
            answer_explanation: "this 代表單數物品，使用 it 回答。",
            answer_correct_option_id: "a",
            shared_repaired_points: 3,
            shared_boss_armor: 2,
            updated_participant_state: "in_progress",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await submitClassroomResponseWithSupabase(client, {
      activityId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      questionId: "g4-yes-no-practice-01",
      questionVersion: 1,
      selectedOptionId: "a",
      deviceEventId: "77777777-7777-4777-8777-777777777777",
    });

    expect(client.rpc).toHaveBeenCalledWith("submit_classroom_response", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
      p_participant_id: "44444444-4444-4444-8444-444444444444",
      p_question_id: "g4-yes-no-practice-01",
      p_question_version: 1,
      p_selected_option_id: "a",
      p_device_event_id: "77777777-7777-4777-8777-777777777777",
    });
    expect(result).toEqual({
      responseId: "66666666-6666-4666-8666-666666666666",
      outcome: "independent_correct",
      explanation: "this 代表單數物品，使用 it 回答。",
      correctOptionId: "a",
      sharedRepairedPoints: 3,
      sharedBossArmor: 2,
      participantState: "in_progress",
    });
  });
});
