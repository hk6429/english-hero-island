import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  QuestionReviewQueueItem,
  QuestionReviewSubmission,
} from "@/components/governance/QuestionReviewCard";

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

const reviewQueueRowsSchema = z.array(
  z.object({
    question_id: z.string().min(1),
    question_version: z.coerce.number().int().positive(),
    question_status: z.literal("in_review"),
    grade: gradeSchema,
    skill: z.string().min(1),
    indicator: z.string().min(1),
    micro_skill: z.string().min(1),
    difficulty: z.coerce.number().int().min(1).max(3),
    modality: z.enum(["text", "audio", "image"]),
    question_type: z.enum([
      "multiple_choice",
      "listening_choice",
      "image_choice",
      "sentence_order",
    ]),
    purpose: z.enum(["diagnostic", "practice", "boss", "rescue", "review"]),
    prompt: z.string().min(1),
    audio: z.unknown().nullable(),
    image: z.unknown().nullable(),
    options: z.array(optionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
    explanation: z.string().min(1),
    hints: z.array(z.string().min(1)).min(1),
    variant_group: z.string().min(1),
    source: z.object({
      kind: z.enum(["original", "licensed", "research_reference"]),
      note: z.string().min(1),
      usageRights: z.string().min(1),
    }),
    author: z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
    }),
    created_by: z.string().uuid().nullable(),
    supersedes_version: z.coerce.number().int().positive().nullable(),
    change_summary: z.string().min(4).nullable(),
    locked_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    approval_count: z.coerce.number().int().nonnegative(),
    change_request_count: z.coerce.number().int().nonnegative(),
  }),
);

const reviewResultRowsSchema = z
  .array(
    z.object({
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.enum(["in_review", "reviewed", "disputed"]),
      approval_count: z.coerce.number().int().nonnegative(),
      change_request_count: z.coerce.number().int().nonnegative(),
      reviewed_at: z.string().datetime().nullable(),
      review_recorded_at: z.string().datetime(),
    }),
  )
  .length(1);

const publicationRowsSchema = z
  .array(
    z.object({
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.literal("published"),
      published_at: z.string().datetime(),
    }),
  )
  .length(1);

const disputeRowsSchema = z
  .array(
    z.object({
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.literal("disputed"),
      disputed_at: z.string().datetime(),
    }),
  )
  .length(1);

const retirementRowsSchema = z
  .array(
    z.object({
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.literal("retired"),
      retired_at: z.string().datetime(),
    }),
  )
  .length(1);

type RpcError = Readonly<{ message?: string }> | null;

function assertRpcSucceeded(error: RpcError) {
  if (error) {
    throw new Error(error.message ?? "題庫治理操作失敗。");
  }
}

export type SubmittedQuestionReview = Readonly<{
  questionId: string;
  questionVersion: number;
  status: "in_review" | "reviewed" | "disputed";
  approvalCount: number;
  changeRequestCount: number;
  reviewedAt: string | null;
  reviewRecordedAt: string;
}>;

export type QuestionStatusActionResult = Readonly<{
  questionId: string;
  questionVersion: number;
  status: "published" | "disputed" | "retired";
  occurredAt: string;
}>;

export async function listQuestionReviewQueueWithSupabase(
  client: SupabaseClient,
): Promise<ReadonlyArray<QuestionReviewQueueItem>> {
  const { data, error } = await client.rpc("list_question_review_queue");
  assertRpcSucceeded(error);

  return reviewQueueRowsSchema.parse(data ?? []).map((row) => ({
    id: row.question_id,
    version: row.question_version,
    grade: row.grade,
    microSkill: row.micro_skill,
    prompt: row.prompt,
    options: row.options,
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
    hints: row.hints,
    source: row.source,
    authorName: row.author.displayName,
    changeSummary: row.change_summary,
    approvalCount: row.approval_count,
    changeRequestCount: row.change_request_count,
  }));
}

export async function submitQuestionReviewWithSupabase(
  client: SupabaseClient,
  submission: QuestionReviewSubmission,
): Promise<SubmittedQuestionReview> {
  const { data, error } = await client.rpc("submit_question_review", {
    p_question_id: submission.questionId,
    p_question_version: submission.questionVersion,
    p_verdict: submission.verdict,
    p_criteria: submission.criteria,
    p_note: submission.note.trim(),
  });
  assertRpcSucceeded(error);

  const [row] = reviewResultRowsSchema.parse(data ?? []);
  return {
    questionId: row.question_id,
    questionVersion: row.question_version,
    status: row.question_status,
    approvalCount: row.approval_count,
    changeRequestCount: row.change_request_count,
    reviewedAt: row.reviewed_at,
    reviewRecordedAt: row.review_recorded_at,
  };
}

async function runQuestionStatusAction(
  client: SupabaseClient,
  rpcName:
    | "publish_question_version"
    | "report_question_dispute"
    | "retire_question_version",
  questionId: string,
  questionVersion: number,
  note: string,
): Promise<QuestionStatusActionResult> {
  const { data, error } = await client.rpc(rpcName, {
    p_question_id: questionId,
    p_question_version: questionVersion,
    p_note: note.trim(),
  });
  assertRpcSucceeded(error);

  if (rpcName === "publish_question_version") {
    const [row] = publicationRowsSchema.parse(data ?? []);
    return {
      questionId: row.question_id,
      questionVersion: row.question_version,
      status: row.question_status,
      occurredAt: row.published_at,
    };
  }
  if (rpcName === "report_question_dispute") {
    const [row] = disputeRowsSchema.parse(data ?? []);
    return {
      questionId: row.question_id,
      questionVersion: row.question_version,
      status: row.question_status,
      occurredAt: row.disputed_at,
    };
  }

  const [row] = retirementRowsSchema.parse(data ?? []);
  return {
    questionId: row.question_id,
    questionVersion: row.question_version,
    status: row.question_status,
    occurredAt: row.retired_at,
  };
}

export function publishQuestionVersionWithSupabase(
  client: SupabaseClient,
  questionId: string,
  questionVersion: number,
  note: string,
) {
  return runQuestionStatusAction(
    client,
    "publish_question_version",
    questionId,
    questionVersion,
    note,
  );
}

export function reportQuestionDisputeWithSupabase(
  client: SupabaseClient,
  questionId: string,
  questionVersion: number,
  note: string,
) {
  return runQuestionStatusAction(
    client,
    "report_question_dispute",
    questionId,
    questionVersion,
    note,
  );
}

export function retireQuestionVersionWithSupabase(
  client: SupabaseClient,
  questionId: string,
  questionVersion: number,
  note: string,
) {
  return runQuestionStatusAction(
    client,
    "retire_question_version",
    questionId,
    questionVersion,
    note,
  );
}
