import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createClassroomActivityWithSupabase,
  getStudentActivityStateWithSupabase,
  getStudentActivityQuestionsWithSupabase,
  joinClassroomWithSupabase,
  listActivityParticipantStatusWithSupabase,
  listClassroomMicroSkillsWithSupabase,
  listTeacherClassroomsWithSupabase,
  startClassroomActivityWithSupabase,
  submitClassroomResponseWithSupabase,
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
    });

    expect(callOrder).toEqual(["session", "anonymous-auth", "join-rpc"]);
    expect(client.rpc).toHaveBeenCalledWith("join_classroom_activity", {
      p_join_code: "A7K9Q2",
      p_nickname: "小浪",
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
    });

    expect(client.rpc).toHaveBeenCalledWith("create_classroom_activity", {
      p_classroom_id: "22222222-2222-4222-8222-222222222222",
      p_title: "Yes／No 快速救援",
      p_micro_skill: "yes-no-questions",
      p_question_count: 5,
      p_audience: "whole_class",
      p_join_code: "A7K9Q2",
    });
    expect(result).toEqual({
      activityId: "33333333-3333-4333-8333-333333333333",
      joinCode: "A7K9Q2",
      joinClosesAt: "2026-07-15T06:30:00.000Z",
      activityStatus: "waiting",
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
