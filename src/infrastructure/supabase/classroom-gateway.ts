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

const teacherClassroomRowsSchema = z.array(
  z.object({
    classroom_id: z.string().uuid(),
    classroom_title: z.string().min(1),
    grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
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

const startedActivityRowSchema = z.object({
  activity_id: z.string().uuid(),
  activity_status: z.literal("active"),
  started_at: z.string().datetime(),
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

const microSkillLabels: Readonly<Record<string, string>> = {
  "uppercase-lowercase": "大小寫字母配對",
  "letter-listening": "字母聽辨",
  "letter-writing": "字母書寫",
  "phonological-awareness": "音韻覺識",
  "cvc-decoding": "CVC 拼讀",
  "affirmative-negative": "肯定句與否定句",
  "image-sentence-match": "圖句配對",
  "this-that-questions": "This／That 問句",
  "yes-no-questions": "Yes／No 問句",
  adjectives: "形容詞理解",
  "age-and-can": "年齡與 Can 句型",
  "image-sentence-meaning": "圖句語意",
  "short-dialogue": "短對話理解",
  "weather-listening": "天氣聽力",
  "clothing-and-have": "衣物與 Have 句型",
  "integrated-dialogue-text": "整合對話閱讀",
  "occupation-and-family": "職業與家庭",
  "place-and-destination": "地點與目的地",
  "present-progressive": "現在進行式",
};

export type StartedClassroomActivity = Readonly<{
  activityId: string;
  activityStatus: "active";
  startedAt: string;
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
    label: microSkillLabels[row.micro_skill] ?? row.micro_skill.replaceAll("-", " "),
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

export async function createClassroomActivityWithSupabase(
  client: SupabaseClient,
  request: QuickActivityRequest,
): Promise<CreatedQuickActivity> {
  const { data, error } = await client.rpc("create_classroom_activity", {
    p_classroom_id: request.classroomId,
    p_title: request.title,
    p_micro_skill: request.microSkill,
    p_question_count: request.questionCount,
    p_audience: request.audience,
    p_join_code: request.joinCode,
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
  });

  if (error) {
    throw new Error("找不到這場任務，請確認代碼是否正確或已過期。");
  }

  const parsed = joinedActivityRowSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new Error("活動資料不完整，請老師重新建立任務。");
  }

  return {
    activityId: parsed.data.activity_id,
    participantId: parsed.data.participant_id,
    activityTitle: parsed.data.activity_title,
    grade: parsed.data.grade,
    participantState: parsed.data.participant_state,
  };
}
