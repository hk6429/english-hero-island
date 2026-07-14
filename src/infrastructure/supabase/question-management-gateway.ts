import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  CreatedQuestionDraft,
  ImportedQuestionDrafts,
  QuestionDraftInput,
} from "@/components/governance/QuestionAuthoringPanel";
import {
  type ImportedQuestionDraft,
  validateQuestionImport,
} from "@/domain/questions/question-import";

const createdDraftRowSchema = z.object({
  question_id: z.string().min(1),
  question_version: z.coerce.number().int().positive(),
  question_status: z.literal("draft"),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});

const createdDraftRowsSchema = z.array(createdDraftRowSchema).length(1);
const importedDraftRowsSchema = z.array(createdDraftRowSchema).min(1).max(200);
const createdRevisionRowsSchema = z
  .array(
    z.object({
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.literal("draft"),
      supersedes_version: z.coerce.number().int().positive(),
      change_summary: z.string().min(4),
      created_by: z.string().uuid(),
      created_at: z.string().datetime(),
    }),
  )
  .length(1);
const submittedReviewRowsSchema = z
  .array(
    z
      .object({
        question_id: z.string().min(1),
        question_version: z.coerce.number().int().positive(),
        question_status: z.literal("in_review"),
        locked_at: z.string().datetime(),
        content_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        content_hash_schema: z.literal(
          "question-review-snapshot-pg-jsonb-text-v1",
        ),
        content_hashed_at: z.string().datetime(),
      })
      .refine((row) => row.content_hashed_at === row.locked_at, {
        message: "content hash timestamp must match the lock timestamp",
      }),
  )
  .length(1);
const governanceProfileRowsSchema = z
  .array(
    z.object({
      user_id: z.string().uuid(),
      display_name: z.string().min(1),
      reviewer_role: z.enum([
        "english_teacher",
        "content_editor",
        "administrator",
      ]),
      approval_status: z.enum(["pending", "approved", "suspended"]),
    }),
  )
  .length(1);
const questionStatusSchema = z.enum([
  "draft",
  "in_review",
  "reviewed",
  "published",
  "disputed",
  "retired",
]);
const gradeSchema = z.union([
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
const sourceSchema = z.object({
  kind: z.enum(["original", "licensed", "research_reference"]),
  url: z.string().url().optional(),
  note: z.string().min(1),
  usageRights: z.string().min(1),
});
const questionBankRowSchema = z.object({
  question_id: z.string().min(1),
  question_version: z.coerce.number().int().positive(),
  question_status: questionStatusSchema,
  grade: gradeSchema,
  skill: z.enum([
    "letters",
    "phonics",
    "vocabulary",
    "classroom_english",
    "grammar",
    "comprehension",
  ]),
  indicator: z.string().min(1),
  micro_skill: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  modality: z.enum(["text", "audio", "image"]),
  question_type: z.enum([
    "multiple_choice",
    "listening_choice",
    "image_choice",
    "sentence_order",
  ]),
  purpose: z.enum(["diagnostic", "practice", "boss", "rescue", "review"]),
  prompt: z.string().min(1),
  audio: z
    .object({ src: z.string().min(1), transcript: z.string().min(1) })
    .nullable(),
  image: z.object({ src: z.string().min(1), alt: z.string().min(1) }).nullable(),
  options: z.array(optionSchema).min(2).max(6),
  correct_option_id: z.string().min(1),
  explanation: z.string().min(1),
  hints: z.array(z.string().min(1)).min(1),
  variant_group: z.string().min(1),
  source: sourceSchema,
  author: z.object({ id: z.string().min(1), displayName: z.string().min(1) }),
  created_by: z.string().uuid().nullable(),
  supersedes_version: z.coerce.number().int().positive().nullable(),
  change_summary: z.string().min(4).nullable(),
  locked_at: z.string().datetime().nullable(),
  reviewed_at: z.string().datetime().nullable(),
  published_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  approval_count: z.coerce.number().int().nonnegative(),
  change_request_count: z.coerce.number().int().nonnegative(),
});
const questionSearchRowSchema = questionBankRowSchema.extend({
  total_count: z.coerce.number().int().nonnegative(),
});
const questionQualitySignalRowSchema = z.object({
  question_id: z.string().min(1),
  question_version: z.coerce.number().int().positive(),
  question_status: questionStatusSchema,
  grade: gradeSchema,
  micro_skill: z.string().min(1),
  modality: z.enum(["text", "audio", "image"]),
  prompt: z.string().min(1),
  response_count: z.coerce.number().int().nonnegative(),
  independent_correct_count: z.coerce.number().int().nonnegative(),
  assisted_correct_count: z.coerce.number().int().nonnegative(),
  rescued_count: z.coerce.number().int().nonnegative(),
  pending_support_count: z.coerce.number().int().nonnegative(),
  is_disputed: z.boolean(),
});

type RpcError = Readonly<{ message?: string }> | null;

function assertRpcSucceeded(error: RpcError) {
  if (error) {
    throw new Error(error.message ?? "題庫管理操作失敗。");
  }
}

function draftContent(draft: QuestionDraftInput) {
  return {
    grade: draft.grade,
    skill: draft.skill,
    indicator: draft.indicator,
    microSkill: draft.microSkill,
    difficulty: draft.difficulty,
    modality: draft.modality,
    questionType: draft.questionType,
    purpose: draft.purpose,
    prompt: draft.prompt,
    ...(draft.audio ? { audio: draft.audio } : {}),
    ...(draft.image ? { image: draft.image } : {}),
    options: draft.options,
    correctOptionId: draft.correctOptionId,
    explanation: draft.explanation,
    hints: draft.hints,
    variantGroup: draft.variantGroup,
    source: draft.source,
  };
}

function importedQuestionContent(question: ImportedQuestionDraft) {
  return {
    grade: question.grade,
    skill: question.skill,
    indicator: question.indicator,
    microSkill: question.microSkill,
    difficulty: question.difficulty,
    modality: question.modality,
    questionType: question.questionType,
    purpose: question.purpose,
    prompt: question.prompt,
    ...(question.audio ? { audio: question.audio } : {}),
    ...(question.image ? { image: question.image } : {}),
    options: question.options,
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    hints: question.hints,
    variantGroup: question.variantGroup,
    source: question.source,
  };
}

export type ContentGovernanceProfile = Readonly<{
  userId: string;
  displayName: string;
  role: "english_teacher" | "content_editor" | "administrator";
  approvalStatus: "pending" | "approved" | "suspended";
}>;

export async function getContentGovernanceProfileWithSupabase(
  client: SupabaseClient,
): Promise<ContentGovernanceProfile> {
  const { data, error } = await client.rpc("get_content_governance_profile");
  assertRpcSucceeded(error);

  const [row] = governanceProfileRowsSchema.parse(data ?? []);
  return {
    userId: row.user_id,
    displayName: row.display_name,
    role: row.reviewer_role,
    approvalStatus: row.approval_status,
  };
}

export type QuestionBankItem = Readonly<{
  id: string;
  version: number;
  status: z.infer<typeof questionStatusSchema>;
  grade: z.infer<typeof gradeSchema>;
  skill: z.infer<typeof questionBankRowSchema>["skill"];
  indicator: string;
  microSkill: string;
  difficulty: 1 | 2 | 3;
  modality: "text" | "audio" | "image";
  questionType:
    | "multiple_choice"
    | "listening_choice"
    | "image_choice"
    | "sentence_order";
  purpose: "diagnostic" | "practice" | "boss" | "rescue" | "review";
  prompt: string;
  audio: Readonly<{ src: string; transcript: string }> | null;
  image: Readonly<{ src: string; alt: string }> | null;
  options: ReadonlyArray<Readonly<{ id: string; text: string }>>;
  correctOptionId: string;
  explanation: string;
  hints: ReadonlyArray<string>;
  variantGroup: string;
  source: z.infer<typeof sourceSchema>;
  author: Readonly<{ id: string; displayName: string }>;
  createdBy: string | null;
  supersedesVersion: number | null;
  changeSummary: string | null;
  lockedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  approvalCount: number;
  changeRequestCount: number;
}>;

function mapQuestionBankRow(
  row: z.infer<typeof questionBankRowSchema>,
): QuestionBankItem {
  return {
    id: row.question_id,
    version: row.question_version,
    status: row.question_status,
    grade: row.grade,
    skill: row.skill,
    indicator: row.indicator,
    microSkill: row.micro_skill,
    difficulty: row.difficulty,
    modality: row.modality,
    questionType: row.question_type,
    purpose: row.purpose,
    prompt: row.prompt,
    audio: row.audio,
    image: row.image,
    options: row.options,
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
    hints: row.hints,
    variantGroup: row.variant_group,
    source: row.source,
    author: row.author,
    createdBy: row.created_by,
    supersedesVersion: row.supersedes_version,
    changeSummary: row.change_summary,
    lockedAt: row.locked_at,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    approvalCount: row.approval_count,
    changeRequestCount: row.change_request_count,
  };
}

export type SearchQuestionBankFilters = Readonly<{
  query?: string;
  grade?: 3 | 4 | 5 | 6;
  skill?: QuestionBankItem["skill"];
  microSkill?: string;
  status?: QuestionBankItem["status"];
  modality?: QuestionBankItem["modality"];
  difficulty?: 1 | 2 | 3;
  cursor?: Readonly<{
    createdAt: string;
    questionId: string;
    questionVersion: number;
  }>;
  limit?: number;
}>;

export type QuestionBankSearchResult = Readonly<{
  items: ReadonlyArray<QuestionBankItem>;
  totalCount: number;
  nextCursor: Readonly<{
    createdAt: string;
    questionId: string;
    questionVersion: number;
  }> | null;
}>;

export async function searchQuestionBankWithSupabase(
  client: SupabaseClient,
  filters: SearchQuestionBankFilters = {},
): Promise<QuestionBankSearchResult> {
  const limit = filters.limit ?? 50;
  const { data, error } = await client.rpc("search_question_bank", {
    p_query: filters.query?.trim() || null,
    p_grade: filters.grade ?? null,
    p_skill: filters.skill ?? null,
    p_micro_skill: filters.microSkill?.trim() || null,
    p_status: filters.status ?? null,
    p_modality: filters.modality ?? null,
    p_difficulty: filters.difficulty ?? null,
    p_cursor_created_at: filters.cursor?.createdAt ?? null,
    p_cursor_question_id: filters.cursor?.questionId ?? null,
    p_cursor_question_version: filters.cursor?.questionVersion ?? null,
    p_limit: limit,
  });
  assertRpcSucceeded(error);

  const rows = z.array(questionSearchRowSchema).parse(data ?? []);
  const lastRow = rows.at(-1);
  return {
    items: rows.map(mapQuestionBankRow),
    totalCount: rows[0]?.total_count ?? 0,
    nextCursor:
      rows.length === limit && lastRow
        ? {
            createdAt: lastRow.created_at,
            questionId: lastRow.question_id,
            questionVersion: lastRow.question_version,
          }
        : null,
  };
}

export async function listQuestionVersionsWithSupabase(
  client: SupabaseClient,
  questionId: string,
): Promise<ReadonlyArray<QuestionBankItem>> {
  const { data, error } = await client.rpc("list_question_versions", {
    p_question_id: questionId,
  });
  assertRpcSucceeded(error);

  return z.array(questionBankRowSchema).parse(data ?? []).map(mapQuestionBankRow);
}

export type QuestionQualitySignal = Readonly<{
  questionId: string;
  version: number;
  status: QuestionBankItem["status"];
  grade: QuestionBankItem["grade"];
  microSkill: string;
  modality: QuestionBankItem["modality"];
  prompt: string;
  responseCount: number;
  independentCorrectCount: number;
  assistedCorrectCount: number;
  rescuedCount: number;
  pendingSupportCount: number;
  isDisputed: boolean;
}>;

export type QuestionQualityFilters = Readonly<{
  grade?: QuestionBankItem["grade"];
  microSkill?: string;
  status?: QuestionBankItem["status"];
  modality?: QuestionBankItem["modality"];
}>;

export async function listQuestionQualitySignalsWithSupabase(
  client: SupabaseClient,
  filters: QuestionQualityFilters = {},
): Promise<ReadonlyArray<QuestionQualitySignal>> {
  const { data, error } = await client.rpc("list_question_quality_signals", {
    p_grade: filters.grade ?? null,
    p_micro_skill: filters.microSkill?.trim() || null,
    p_status: filters.status ?? null,
    p_modality: filters.modality ?? null,
  });
  assertRpcSucceeded(error);

  return z.array(questionQualitySignalRowSchema).parse(data ?? []).map((row) => ({
    questionId: row.question_id,
    version: row.question_version,
    status: row.question_status,
    grade: row.grade,
    microSkill: row.micro_skill,
    modality: row.modality,
    prompt: row.prompt,
    responseCount: row.response_count,
    independentCorrectCount: row.independent_correct_count,
    assistedCorrectCount: row.assisted_correct_count,
    rescuedCount: row.rescued_count,
    pendingSupportCount: row.pending_support_count,
    isDisputed: row.is_disputed,
  }));
}

export async function createQuestionDraftWithSupabase(
  client: SupabaseClient,
  draft: QuestionDraftInput,
): Promise<CreatedQuestionDraft> {
  const { data, error } = await client.rpc("create_question_draft", {
    p_question_id: draft.id,
    p_content: draftContent(draft),
  });
  assertRpcSucceeded(error);

  const [row] = createdDraftRowsSchema.parse(data ?? []);
  return {
    questionId: row.question_id,
    version: row.question_version,
    status: row.question_status,
  };
}

export async function importQuestionDraftsFromJsonWithSupabase(
  client: SupabaseClient,
  rawJson: string,
): Promise<ImportedQuestionDrafts> {
  let input: unknown;
  try {
    input = JSON.parse(rawJson);
  } catch {
    throw new Error("題目 JSON 格式錯誤。");
  }

  const result = validateQuestionImport(input);
  if (!result.ok) {
    const firstError = result.errors[0];
    throw new Error(
      firstError
        ? `第 ${firstError.index + 1} 題 ${firstError.path}：${firstError.message}`
        : "題目匯入驗證失敗。",
    );
  }

  const { data, error } = await client.rpc("import_question_drafts", {
    p_drafts: result.questions.map((question) => ({
      questionId: question.id,
      content: importedQuestionContent(question),
    })),
  });
  assertRpcSucceeded(error);

  const rows = importedDraftRowsSchema.parse(data ?? []);
  return { importedCount: rows.length };
}

export type QuestionRevisionInput = Readonly<{
  questionId: string;
  fromVersion: number;
  changeSummary: string;
  draft: QuestionDraftInput;
}>;

export type CreatedQuestionRevision = Readonly<{
  questionId: string;
  version: number;
  status: "draft";
  supersedesVersion: number;
  changeSummary: string;
}>;

export async function createQuestionRevisionWithSupabase(
  client: SupabaseClient,
  input: QuestionRevisionInput,
): Promise<CreatedQuestionRevision> {
  const { data, error } = await client.rpc("create_question_revision", {
    p_question_id: input.questionId,
    p_from_version: input.fromVersion,
    p_change_summary: input.changeSummary.trim(),
    p_content: draftContent(input.draft),
  });
  assertRpcSucceeded(error);

  const [row] = createdRevisionRowsSchema.parse(data ?? []);
  return {
    questionId: row.question_id,
    version: row.question_version,
    status: row.question_status,
    supersedesVersion: row.supersedes_version,
    changeSummary: row.change_summary,
  };
}

export type SubmittedQuestionForReview = Readonly<{
  questionId: string;
  version: number;
  status: "in_review";
  lockedAt: string;
  contentSha256: string;
  contentHashSchema: "question-review-snapshot-pg-jsonb-text-v1";
  contentHashedAt: string;
}>;

export async function submitQuestionForReviewWithSupabase(
  client: SupabaseClient,
  questionId: string,
  questionVersion: number,
  note: string,
): Promise<SubmittedQuestionForReview> {
  const { data, error } = await client.rpc("submit_question_for_review", {
    p_question_id: questionId,
    p_question_version: questionVersion,
    p_note: note.trim(),
  });
  assertRpcSucceeded(error);

  const [row] = submittedReviewRowsSchema.parse(data ?? []);
  return {
    questionId: row.question_id,
    version: row.question_version,
    status: row.question_status,
    lockedAt: row.locked_at,
    contentSha256: row.content_sha256,
    contentHashSchema: row.content_hash_schema,
    contentHashedAt: row.content_hashed_at,
  };
}
