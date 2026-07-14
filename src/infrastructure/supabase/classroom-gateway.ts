import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  JoinedClassroomActivity,
  StudentJoinRequest,
} from "@/components/classroom/StudentJoinForm";
import type {
  ClassroomMicroSkillOption,
  CreatedQuickActivity,
  QuickActivityRequest,
  TeacherClassroomOption,
} from "@/components/classroom/TeacherQuickActivityForm";
import type { ClassroomStatusInput } from "@/domain/classroom/project-classroom-status";
import type { StudentActivityQuestion } from "@/domain/classroom/build-student-activity-payload";
import type { ActivityLearningEvidence } from "@/domain/classroom/derive-activity-learning-report";
import { getMicroSkillLabel } from "@/domain/classroom/micro-skill-catalog";
import {
  createClassroomDraft,
  type SupportedGrade,
} from "@/domain/classroom/create-classroom";
import { validateActivityTargets } from "@/domain/classroom/validate-activity-targets";

const joinedActivityRowSchema = z.object({
  activity_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  activity_title: z.string().min(1),
  grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  participant_state: z.literal("joined"),
});

const createdActivityRowSchema = z.object({
  activity_id: z.string().uuid(),
  join_code: z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/),
  join_closes_at: z.string().datetime(),
  activity_status: z.literal("waiting"),
});

const teacherClassroomRowSchema = z.object({
  classroom_id: z.string().uuid(),
  classroom_title: z.string().min(1),
  grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
});

const teacherClassroomRowsSchema = z.array(teacherClassroomRowSchema);

const classroomMemberRowSchema = z.object({
  member_id: z.string().uuid(),
  member_code: z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/),
  display_alias: z.string().min(1).max(24),
  group_label: z.string().min(1).max(24).nullable(),
});

const classroomMemberRowsSchema = z.array(classroomMemberRowSchema);

const archivedClassroomMemberRowSchema = z.object({
  member_id: z.string().uuid(),
  archived_at: z.string().datetime(),
});

const archivedClassroomRowSchema = z.object({
  classroom_id: z.string().uuid(),
  archived_at: z.string().datetime(),
});

const teacherActivityRowsSchema = z.array(
  z.object({
    activity_id: z.string().uuid(),
    activity_title: z.string().min(1),
    join_code: z.string().regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/),
    activity_status: z.enum(["waiting", "active", "completed", "ended"]),
    join_closes_at: z.string().datetime(),
    question_count: z.union([z.literal(3), z.literal(5)]),
    audience: z.enum(["whole_class", "small_group", "individual"]),
    created_at: z.string().datetime(),
  }),
);

const microSkillRowsSchema = z.array(
  z.object({
    micro_skill: z.string().min(1),
    available_questions: z.coerce.number().int().nonnegative(),
  }),
);

const participantStatusRowsSchema = z.array(
  z.object({
    nickname: z.string().min(1).max(12),
    participant_state: z.enum([
      "joined",
      "in_progress",
      "completed",
      "may_need_help",
    ]),
  }),
);

const activityLearningEvidenceRowsSchema = z
  .array(
    z.object({
      activity_id: z.string().uuid(),
      activity_title: z.string().min(1),
      activity_status: z.enum(["waiting", "active", "completed", "ended"]),
      audience: z.enum(["whole_class", "small_group", "individual"]),
      micro_skill: z.string().min(1),
      question_count: z.union([z.literal(3), z.literal(5)]),
      participant_count: z.coerce.number().int().nonnegative(),
      responding_participant_count: z.coerce.number().int().nonnegative(),
      completed_participant_count: z.coerce.number().int().nonnegative(),
      question_position: z.coerce.number().int().min(1).max(5),
      question_id: z.string().min(1),
      response_count: z.coerce.number().int().nonnegative(),
      independent_correct_count: z.coerce.number().int().nonnegative(),
      assisted_correct_count: z.coerce.number().int().nonnegative(),
      rescued_count: z.coerce.number().int().nonnegative(),
      pending_support_count: z.coerce.number().int().nonnegative(),
    }),
  )
  .min(1);

const startedActivityRowSchema = z.object({
  activity_id: z.string().uuid(),
  activity_status: z.literal("active"),
  started_at: z.string().datetime(),
});

const endedActivityRowSchema = z.object({
  activity_id: z.string().uuid(),
  activity_status: z.literal("ended"),
  ended_at: z.string().datetime(),
});

const closedActivityJoinRowSchema = z.object({
  activity_id: z.string().uuid(),
  activity_status: z.enum(["waiting", "active"]),
  join_closes_at: z.string().datetime(),
});

const studentActivityStateRowSchema = z.object({
  activity_status: z.enum(["waiting", "active", "completed", "ended"]),
  activity_title: z.string().min(1),
  grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  question_count: z.union([z.literal(3), z.literal(5)]),
  contribution_count: z.coerce.number().int().nonnegative(),
  repaired_points: z.coerce.number().int().nonnegative(),
  boss_armor: z.coerce.number().int().nonnegative(),
  participant_state: z.enum([
    "joined",
    "in_progress",
    "completed",
    "may_need_help",
  ]),
  answered_count: z.coerce.number().int().nonnegative(),
});

const studentActivityQuestionRowsSchema = z.array(
  z.object({
    position: z.number().int().min(1).max(6),
    question_id: z.string().min(1),
    question_version: z.number().int().positive(),
    grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    micro_skill: z.string().min(1),
    purpose: z.enum(["diagnostic", "practice", "boss", "rescue", "review"]),
    modality: z.enum(["text", "audio", "image"]),
    question_type: z.enum([
      "multiple_choice",
      "listening_choice",
      "image_choice",
      "sentence_order",
    ]),
    prompt: z.string().min(1),
    options: z.array(
      z.object({ id: z.string().min(1), text: z.string().min(1) }),
    ),
    audio_src: z.string().min(1).nullable(),
    image_src: z.string().min(1).nullable(),
    image_alt: z.string().min(1).nullable(),
  }),
);

const submittedResponseRowSchema = z.object({
  submitted_response_id: z.string().uuid(),
  learning_outcome: z.enum([
    "independent_correct",
    "assisted_correct",
    "rescued",
    "pending_support",
  ]),
  answer_explanation: z.string().min(1),
  answer_correct_option_id: z.string().min(1),
  shared_repaired_points: z.coerce.number().int().nonnegative(),
  shared_boss_armor: z.coerce.number().int().nonnegative(),
  updated_participant_state: z.enum([
    "joined",
    "in_progress",
    "completed",
    "may_need_help",
  ]),
});

export type StartedClassroomActivity = Readonly<{
  activityId: string;
  activityStatus: "active";
  startedAt: string;
}>;

export type CreateTeacherClassroomRequest = Readonly<{
  title: string;
  grade: SupportedGrade;
}>;

export type ArchivedTeacherClassroom = Readonly<{
  classroomId: string;
  archivedAt: string;
}>;

export type ClassroomMember = Readonly<{
  id: string;
  code: string;
  alias: string;
  groupLabel: string | null;
}>;

export type CreateClassroomMemberRequest = Readonly<{
  classroomId: string;
  displayAlias: string;
  memberCode: string;
  groupLabel: string;
}>;

export type ArchivedClassroomMember = Readonly<{
  memberId: string;
  archivedAt: string;
}>;

export type TeacherActivitySummary = Readonly<{
  id: string;
  title: string;
  joinCode: string;
  status: "waiting" | "active" | "completed" | "ended";
  joinClosesAt: string;
  questionCount: 3 | 5;
  audience: "whole_class" | "small_group" | "individual";
  createdAt: string;
}>;

export type EndedClassroomActivity = Readonly<{
  activityId: string;
  activityStatus: "ended";
  endedAt: string;
}>;

export type ClosedClassroomJoin = Readonly<{
  activityId: string;
  activityStatus: "waiting" | "active";
  joinClosesAt: string;
}>;

export type StudentActivityState = Readonly<{
  activityStatus: "waiting" | "active" | "completed" | "ended";
  activityTitle: string;
  grade: 3 | 4 | 5 | 6;
  questionCount: 3 | 5;
  contributionCount: number;
  repairedPoints: number;
  bossArmor: number;
  participantState: "joined" | "in_progress" | "completed" | "may_need_help";
  answeredCount: number;
}>;

export type ClassroomStudentQuestion = StudentActivityQuestion &
  Readonly<{ position: number }>;

export type SubmitClassroomResponseRequest = Readonly<{
  activityId: string;
  participantId: string;
  questionId: string;
  questionVersion: number;
  selectedOptionId: string;
  hintsUsed: number;
  deviceEventId: string;
}>;

export type SubmittedClassroomResponse = Readonly<{
  responseId: string;
  outcome: "independent_correct" | "assisted_correct" | "rescued" | "pending_support";
  explanation: string;
  correctOptionId: string;
  sharedRepairedPoints: number;
  sharedBossArmor: number;
  participantState: "joined" | "in_progress" | "completed" | "may_need_help";
}>;

export async function submitClassroomResponseWithSupabase(
  client: SupabaseClient,
  request: SubmitClassroomResponseRequest,
): Promise<SubmittedClassroomResponse> {
  const { data, error } = await client.rpc("submit_classroom_response", {
    p_activity_id: request.activityId,
    p_participant_id: request.participantId,
    p_question_id: request.questionId,
    p_question_version: request.questionVersion,
    p_selected_option_id: request.selectedOptionId,
    p_hints_used: request.hintsUsed,
    p_device_event_id: request.deviceEventId,
  });
  if (error) {
    throw new Error("答案送出失敗，請保留本頁並再試一次。");
  }

  const parsed = submittedResponseRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("判分結果不完整，請老師協助確認活動狀態。");
  }

  return {
    responseId: parsed.data.submitted_response_id,
    outcome: parsed.data.learning_outcome,
    explanation: parsed.data.answer_explanation,
    correctOptionId: parsed.data.answer_correct_option_id,
    sharedRepairedPoints: parsed.data.shared_repaired_points,
    sharedBossArmor: parsed.data.shared_boss_armor,
    participantState: parsed.data.updated_participant_state,
  };
}

export async function getStudentActivityQuestionsWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<ReadonlyArray<ClassroomStudentQuestion>> {
  const { data, error } = await client.rpc("get_student_activity_questions", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法載入課堂題目，請確認老師已啟動任務。");
  }

  const parsed = studentActivityQuestionRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("課堂題目格式不完整，請老師重新建立活動。");
  }

  return parsed.data.map((row) => ({
    position: row.position,
    id: row.question_id,
    version: row.question_version,
    grade: row.grade,
    microSkill: row.micro_skill,
    purpose: row.purpose,
    modality: row.modality,
    questionType: row.question_type,
    prompt: row.prompt,
    options: row.options,
    ...(row.audio_src ? { audio: { src: row.audio_src } } : {}),
    ...(row.image_src && row.image_alt
      ? { image: { src: row.image_src, alt: row.image_alt } }
      : {}),
  }));
}

export async function getStudentActivityStateWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<StudentActivityState> {
  const { data, error } = await client.rpc("get_student_activity_state", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法取得任務狀態，請確認仍使用加入時的匿名裝置。");
  }

  const parsed = studentActivityStateRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("任務狀態不完整，請重新輸入活動碼加入。");
  }

  return {
    activityStatus: parsed.data.activity_status,
    activityTitle: parsed.data.activity_title,
    grade: parsed.data.grade,
    questionCount: parsed.data.question_count,
    contributionCount: parsed.data.contribution_count,
    repairedPoints: parsed.data.repaired_points,
    bossArmor: parsed.data.boss_armor,
    participantState: parsed.data.participant_state,
    answeredCount: parsed.data.answered_count,
  };
}

export async function startClassroomActivityWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<StartedClassroomActivity> {
  const { data, error } = await client.rpc("start_classroom_activity", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法啟動活動，請確認題目完整、活動尚未開始且教師帳號已核准。");
  }

  const parsed = startedActivityRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new Error("活動啟動結果不完整，請重新整理後確認。");
  }

  return {
    activityId: parsed.data.activity_id,
    activityStatus: parsed.data.activity_status,
    startedAt: parsed.data.started_at,
  };
}

export async function endClassroomActivityWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<EndedClassroomActivity> {
  const { data, error } = await client.rpc("end_classroom_activity", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法結束活動，請確認活動仍在等待或進行中。");
  }

  const parsed = endedActivityRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new Error("活動結束結果不完整，請重新整理後確認。");
  }

  return {
    activityId: parsed.data.activity_id,
    activityStatus: parsed.data.activity_status,
    endedAt: parsed.data.ended_at,
  };
}

export async function closeClassroomJoinWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<ClosedClassroomJoin> {
  const { data, error } = await client.rpc("close_classroom_activity_join", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法停止新加入，請確認活動仍在等待或進行中。");
  }

  const parsed = closedActivityJoinRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("停止加入的結果不完整，請重新整理後確認。");
  }

  return {
    activityId: parsed.data.activity_id,
    activityStatus: parsed.data.activity_status,
    joinClosesAt: parsed.data.join_closes_at,
  };
}

export async function listActivityParticipantStatusWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<ReadonlyArray<ClassroomStatusInput>> {
  const { data, error } = await client.rpc("list_activity_participant_status", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法更新課堂狀態，請確認活動仍屬於目前教師。");
  }

  const parsed = participantStatusRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("課堂狀態格式不完整，請重新整理後再試。");
  }

  return parsed.data.map((row) => ({
    nickname: row.nickname,
    state: row.participant_state,
  }));
}

export async function getActivityLearningEvidenceWithSupabase(
  client: SupabaseClient,
  activityId: string,
): Promise<ActivityLearningEvidence> {
  const { data, error } = await client.rpc("get_activity_learning_evidence", {
    p_activity_id: activityId,
  });
  if (error) {
    throw new Error("無法讀取課後學習證據，請確認活動屬於目前教師。");
  }

  const parsed = activityLearningEvidenceRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("課後學習證據格式不完整，請重新整理後再試。");
  }

  const first = parsed.data[0];
  const metadataIsConsistent = parsed.data.every(
    (row) =>
      row.activity_id === first.activity_id &&
      row.activity_title === first.activity_title &&
      row.activity_status === first.activity_status &&
      row.audience === first.audience &&
      row.micro_skill === first.micro_skill &&
      row.question_count === first.question_count &&
      row.participant_count === first.participant_count &&
      row.responding_participant_count === first.responding_participant_count &&
      row.completed_participant_count === first.completed_participant_count,
  );
  const positions = new Set(parsed.data.map((row) => row.question_position));
  const countsAreConsistent = parsed.data.every(
    (row) =>
      row.completed_participant_count <= row.responding_participant_count &&
      row.responding_participant_count <= row.participant_count &&
      row.response_count <= row.participant_count &&
      row.independent_correct_count +
        row.assisted_correct_count +
        row.rescued_count +
        row.pending_support_count <=
        row.response_count,
  );
  if (
    !metadataIsConsistent ||
    !countsAreConsistent ||
    positions.size !== parsed.data.length
  ) {
    throw new Error("課後學習證據彼此矛盾，請聯絡系統管理者。");
  }

  return {
    activityId: first.activity_id,
    title: first.activity_title,
    status: first.activity_status,
    audience: first.audience,
    microSkill: first.micro_skill,
    questionCount: first.question_count,
    participantCount: first.participant_count,
    respondingParticipantCount: first.responding_participant_count,
    completedParticipantCount: first.completed_participant_count,
    questions: parsed.data
      .map((row) => ({
        position: row.question_position,
        questionId: row.question_id,
        responseCount: row.response_count,
        independentCorrectCount: row.independent_correct_count,
        assistedCorrectCount: row.assisted_correct_count,
        rescuedCount: row.rescued_count,
        pendingSupportCount: row.pending_support_count,
      }))
      .sort((left, right) => left.position - right.position),
  };
}

export async function listClassroomMicroSkillsWithSupabase(
  client: SupabaseClient,
  classroomId: string,
): Promise<ReadonlyArray<ClassroomMicroSkillOption>> {
  const { data, error } = await client.rpc("list_classroom_micro_skills", {
    p_classroom_id: classroomId,
  });
  if (error) {
    throw new Error("無法讀取可派能力，請確認題庫與教師核准狀態。");
  }

  const parsed = microSkillRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("能力清單格式不完整，請聯絡系統管理者。");
  }

  return parsed.data.map((row) => ({
    id: row.micro_skill,
    label: getMicroSkillLabel(row.micro_skill),
    availableQuestions: row.available_questions,
  }));
}

export async function listTeacherClassroomsWithSupabase(
  client: SupabaseClient,
): Promise<ReadonlyArray<TeacherClassroomOption>> {
  const { data, error } = await client.rpc("list_teacher_classrooms");
  if (error) {
    throw new Error("無法讀取班級，請確認教師帳號已核准。");
  }

  const parsed = teacherClassroomRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("班級資料格式不完整，請聯絡系統管理者。");
  }

  return parsed.data.map((row) => ({
    id: row.classroom_id,
    title: row.classroom_title,
    grade: row.grade,
  }));
}

export async function listClassroomMembersWithSupabase(
  client: SupabaseClient,
  classroomId: string,
): Promise<ReadonlyArray<ClassroomMember>> {
  const { data, error } = await client.rpc("list_classroom_members", {
    p_classroom_id: classroomId,
  });
  if (error) {
    throw new Error("無法讀取匿名學生名單，請確認班級仍屬於目前教師。");
  }

  const parsed = classroomMemberRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("匿名學生名單格式不完整，請重新整理後再試。");
  }

  return parsed.data.map((row) => ({
    id: row.member_id,
    code: row.member_code,
    alias: row.display_alias,
    groupLabel: row.group_label,
  }));
}

export async function createClassroomMemberWithSupabase(
  client: SupabaseClient,
  request: CreateClassroomMemberRequest,
): Promise<ClassroomMember> {
  const normalized = {
    classroomId: request.classroomId,
    displayAlias: request.displayAlias.trim(),
    memberCode: request.memberCode.trim().toUpperCase(),
    groupLabel: request.groupLabel.trim(),
  };
  const validRequest =
    z.string().uuid().safeParse(normalized.classroomId).success &&
    normalized.displayAlias.length >= 1 &&
    normalized.displayAlias.length <= 24 &&
    /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(normalized.memberCode) &&
    normalized.groupLabel.length <= 24;
  if (!validRequest) {
    throw new Error("請輸入 1–24 字匿名別名、6 碼學習代碼，以及最多 24 字小組名稱。");
  }

  const { data, error } = await client.rpc("create_classroom_member", {
    p_classroom_id: normalized.classroomId,
    p_display_alias: normalized.displayAlias,
    p_member_code: normalized.memberCode,
    p_group_label: normalized.groupLabel || null,
  });
  if (error) {
    if (error.message.includes("already exists")) {
      throw new Error("這個學習代碼已被使用，請換一組代碼。");
    }
    throw new Error("無法新增匿名學生，請確認教師帳號與班級狀態。");
  }

  const parsed = classroomMemberRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("匿名學生已送出，但回傳資料不完整，請重新整理後確認。");
  }

  return {
    id: parsed.data.member_id,
    code: parsed.data.member_code,
    alias: parsed.data.display_alias,
    groupLabel: parsed.data.group_label,
  };
}

export async function archiveClassroomMemberWithSupabase(
  client: SupabaseClient,
  memberId: string,
): Promise<ArchivedClassroomMember> {
  const { data, error } = await client.rpc("archive_classroom_member", {
    p_member_id: memberId,
  });
  if (error) {
    throw new Error("無法封存匿名學生；仍被進行中活動指派時，請先結束活動。");
  }

  const parsed = archivedClassroomMemberRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("匿名學生封存結果不完整，請重新整理後確認。");
  }

  return {
    memberId: parsed.data.member_id,
    archivedAt: parsed.data.archived_at,
  };
}

export async function listTeacherActivitiesWithSupabase(
  client: SupabaseClient,
  classroomId: string,
): Promise<ReadonlyArray<TeacherActivitySummary>> {
  const { data, error } = await client.rpc("list_teacher_activities", {
    p_classroom_id: classroomId,
  });
  if (error) {
    throw new Error("無法讀取最近活動，請確認班級仍屬於目前教師。");
  }

  const parsed = teacherActivityRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("最近活動資料不完整，請重新整理後再試。");
  }

  return parsed.data.map((row) => ({
    id: row.activity_id,
    title: row.activity_title,
    joinCode: row.join_code,
    status: row.activity_status,
    joinClosesAt: row.join_closes_at,
    questionCount: row.question_count,
    audience: row.audience,
    createdAt: row.created_at,
  }));
}

export async function createTeacherClassroomWithSupabase(
  client: SupabaseClient,
  request: CreateTeacherClassroomRequest,
): Promise<TeacherClassroomOption> {
  const draft = createClassroomDraft(request);
  if (!draft.ok) {
    throw new Error("班級名稱需為 1 到 80 個字，年級只能選三至六年級。");
  }

  const { data, error } = await client.rpc("create_teacher_classroom", {
    p_title: draft.classroom.title,
    p_grade: draft.classroom.grade,
  });
  if (error) {
    throw new Error("無法建立班級，請確認教師帳號已通過核准。");
  }

  const parsed = teacherClassroomRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("班級建立結果不完整，請重新整理後確認。");
  }

  return {
    id: parsed.data.classroom_id,
    title: parsed.data.classroom_title,
    grade: parsed.data.grade,
  };
}

export async function archiveTeacherClassroomWithSupabase(
  client: SupabaseClient,
  classroomId: string,
): Promise<ArchivedTeacherClassroom> {
  const { data, error } = await client.rpc("archive_teacher_classroom", {
    p_classroom_id: classroomId,
  });
  if (error) {
    throw new Error("無法封存班級；仍進行中的活動需先結束。");
  }

  const parsed = archivedClassroomRowSchema.safeParse(
    Array.isArray(data) ? data[0] : data,
  );
  if (!parsed.success) {
    throw new Error("班級封存結果不完整，請重新整理後確認。");
  }

  return {
    classroomId: parsed.data.classroom_id,
    archivedAt: parsed.data.archived_at,
  };
}

export async function createClassroomActivityWithSupabase(
  client: SupabaseClient,
  request: QuickActivityRequest,
): Promise<CreatedQuickActivity> {
  const targetValidation = validateActivityTargets(
    request.audience,
    request.targetMemberIds ?? [],
  );
  if (!targetValidation.ok) {
    const messages = {
      invalid_target_id: "目標名單包含無效的匿名學生識別碼。",
      whole_class_cannot_have_targets: "全班任務不應另外指定個別名單。",
      small_group_requires_two_members: "小組任務至少要選 2 位匿名學生。",
      individual_requires_one_member: "個別任務必須剛好選 1 位匿名學生。",
    } as const;
    throw new Error(messages[targetValidation.reason]);
  }

  const { data, error } = await client.rpc("create_classroom_activity", {
    p_classroom_id: request.classroomId,
    p_title: request.title,
    p_micro_skill: request.microSkill,
    p_question_count: request.questionCount,
    p_audience: request.audience,
    p_join_code: request.joinCode,
    p_target_member_ids: targetValidation.targetIds,
  });

  if (error) {
    if (error.message.includes("not enough reviewed questions")) {
      throw new Error("這個能力目前沒有足夠的雙人複核題，請改選題數或能力。");
    }
    if (error.message.includes("join_code")) {
      throw new Error("活動代碼剛好重複，請再按一次建立任務。");
    }
    throw new Error("無法建立活動，請確認教師帳號已核准且班級仍有效。");
  }

  const parsed = createdActivityRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new Error("活動已送出，但回傳資料不完整，請重新整理後確認。");
  }

  return {
    activityId: parsed.data.activity_id,
    joinCode: parsed.data.join_code,
    joinClosesAt: parsed.data.join_closes_at,
    activityStatus: parsed.data.activity_status,
  };
}

export async function joinClassroomWithSupabase(
  client: SupabaseClient,
  request: StudentJoinRequest,
): Promise<JoinedClassroomActivity> {
  const sessionResult = await client.auth.getSession();
  if (sessionResult.error) {
    throw new Error("無法確認匿名身分，請重新整理後再試。");
  }

  if (!sessionResult.data.session?.user.is_anonymous) {
    const anonymousResult = await client.auth.signInAnonymously();
    if (anonymousResult.error || !anonymousResult.data.user) {
      throw new Error("無法建立匿名身分，請老師協助確認連線設定。");
    }
  }

  const { data, error } = await client.rpc("join_classroom_activity", {
    p_join_code: request.joinCode,
    p_nickname: request.nickname,
    p_member_code: request.memberCode.trim()
      ? request.memberCode.trim().toUpperCase()
      : null,
  });

  if (error) {
    throw new Error("找不到這場任務，請確認代碼是否正確或已過期。");
  }

  const parsed = joinedActivityRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new Error("找不到這場任務，請確認代碼是否正確或已過期。");
  }

  return {
    activityId: parsed.data.activity_id,
    participantId: parsed.data.participant_id,
    activityTitle: parsed.data.activity_title,
    grade: parsed.data.grade,
    participantState: parsed.data.participant_state,
  };
}
