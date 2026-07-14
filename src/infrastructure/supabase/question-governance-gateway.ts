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

const audioSchema = z.object({
  src: z.string().min(1),
  transcript: z.string().min(1),
});

const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

const assetEvidenceBaseSchema = z.object({
  assetKind: z.enum(["audio", "image"]),
  assetLocator: z.string().min(1),
  assetSha256: sha256Schema,
  byteLength: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  mimeType: z.enum([
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  rightsEvidenceLocator: z.string().min(1),
  rightsEvidenceSha256: sha256Schema,
  rightsEvidenceByteLength: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  manifestSha256: sha256Schema,
  questionBankSha256: sha256Schema,
  verificationSchema: z.literal("question-asset-byte-receipt-v1"),
  verifiedAt: z.string().datetime({ offset: true }),
});

const assetEvidenceSchema = z
  .discriminatedUnion("rightsSourceKind", [
    assetEvidenceBaseSchema.extend({
      rightsSourceKind: z.literal("original"),
      rightsUsageRights: z.literal("original-for-project"),
    }),
    assetEvidenceBaseSchema.extend({
      rightsSourceKind: z.literal("licensed"),
      rightsUsageRights: z.literal("licensed-for-publication"),
    }),
  ])
  .superRefine((receipt, context) => {
    const extensionByMime = {
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    } as const;
    const expectedKind = receipt.mimeType.startsWith("audio/")
      ? "audio"
      : "image";
    const expectedLocator =
      `/assets/question-assets/${receipt.assetSha256}.` +
      extensionByMime[receipt.mimeType];

    if (receipt.assetKind !== expectedKind) {
      context.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: "素材種類與 MIME 不一致。",
      });
    }
    if (receipt.assetLocator !== expectedLocator) {
      context.addIssue({
        code: "custom",
        path: ["assetLocator"],
        message: "素材位置未綁定內容雜湊。",
      });
    }
    if (
      !new RegExp(
        `(^|/)${receipt.rightsEvidenceSha256}\\.(md|txt|pdf)$`,
      ).test(receipt.rightsEvidenceLocator)
    ) {
      context.addIssue({
        code: "custom",
        path: ["rightsEvidenceLocator"],
        message: "授權證明位置未綁定內容雜湊。",
      });
    }
  });

const reviewQueueRowSchema = z
  .object({
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
    audio: audioSchema.nullable(),
    image: imageSchema.nullable(),
    options: z.array(optionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
    explanation: z.string().min(1),
    hints: z.array(z.string().min(1)).min(1),
    variant_group: z.string().min(1),
    source: z.object({
      kind: z.enum(["original", "licensed", "research_reference"]),
      url: z.string().url().optional(),
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
    content_sha256: sha256Schema,
    content_hash_schema: z.literal(
      "question-review-snapshot-pg-jsonb-text-v1",
    ),
    asset_evidence: z.array(assetEvidenceSchema).max(1),
    locked_at: z.string().datetime(),
    created_at: z.string().datetime(),
  })
  .superRefine((row, context) => {
    const [receipt] = row.asset_evidence;
    const addAssetIssue = (message: string) =>
      context.addIssue({
        code: "custom",
        path: ["asset_evidence"],
        message,
      });

    if (row.modality === "text") {
      if (row.audio !== null || row.image !== null || row.asset_evidence.length !== 0) {
        addAssetIssue("文字題不可附帶音訊、圖片或正式素材收據。");
      }
      return;
    }

    if (row.asset_evidence.length !== 1 || !receipt) {
      addAssetIssue("媒體題必須具備一份正式素材收據。");
      return;
    }

    if (row.modality === "audio") {
      if (
        row.audio === null ||
        row.image !== null ||
        receipt.assetKind !== "audio" ||
        receipt.assetLocator !== row.audio?.src
      ) {
        addAssetIssue("音訊題內容與正式素材收據不一致。");
      }
      return;
    }

    if (
      row.image === null ||
      row.audio !== null ||
      receipt.assetKind !== "image" ||
      receipt.assetLocator !== row.image?.src
    ) {
      addAssetIssue("圖片題內容與正式素材收據不一致。");
    }
  });

const reviewQueueRowsSchema = z.array(reviewQueueRowSchema);

const reviewResultRowsSchema = z
  .array(
    z.object({
      review_id: z.string().uuid(),
      question_id: z.string().min(1),
      question_version: z.coerce.number().int().positive(),
      question_status: z.enum(["in_review", "reviewed", "disputed"]),
      approval_count: z.coerce.number().int().nonnegative(),
      change_request_count: z.coerce.number().int().nonnegative(),
      acknowledged_content_sha256: z.string().regex(/^[0-9a-f]{64}$/),
      acknowledged_content_hash_schema: z.literal(
        "question-review-snapshot-pg-jsonb-text-v1",
      ),
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
  reviewId: string;
  questionId: string;
  questionVersion: number;
  status: "in_review" | "reviewed" | "disputed";
  approvalCount: number;
  changeRequestCount: number;
  acknowledgedContentSha256: string;
  acknowledgedContentHashSchema: "question-review-snapshot-pg-jsonb-text-v1";
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
    modality: row.modality,
    prompt: row.prompt,
    audio: row.audio,
    image: row.image,
    options: row.options,
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
    hints: row.hints,
    source: row.source,
    authorName: row.author.displayName,
    changeSummary: row.change_summary,
    contentSha256: row.content_sha256,
    contentHashSchema: row.content_hash_schema,
    assetEvidence: row.asset_evidence,
    lockedAt: row.locked_at,
  }));
}

export async function submitQuestionReviewWithSupabase(
  client: SupabaseClient,
  submission: QuestionReviewSubmission,
): Promise<SubmittedQuestionReview> {
  const { data, error } = await client.rpc("submit_question_review", {
    p_question_id: submission.questionId,
    p_question_version: submission.questionVersion,
    p_expected_content_sha256: submission.expectedContentSha256,
    p_expected_content_hash_schema: submission.expectedContentHashSchema,
    p_verdict: submission.verdict,
    p_criteria: submission.criteria,
    p_note: submission.note.trim(),
  });
  assertRpcSucceeded(error);

  const [row] = reviewResultRowsSchema.parse(data ?? []);
  if (
    row.question_id !== submission.questionId ||
    row.question_version !== submission.questionVersion
  ) {
    throw new Error("伺服器回傳的複核題目版本與送出內容不一致，請重新載入後再試。");
  }
  if (
    row.acknowledged_content_sha256 !== submission.expectedContentSha256 ||
    row.acknowledged_content_hash_schema !== submission.expectedContentHashSchema
  ) {
    throw new Error("伺服器保存的內容確認收據與送出內容不一致，請重新載入後再複核。");
  }
  return {
    reviewId: row.review_id,
    questionId: row.question_id,
    questionVersion: row.question_version,
    status: row.question_status,
    approvalCount: row.approval_count,
    changeRequestCount: row.change_request_count,
    acknowledgedContentSha256: row.acknowledged_content_sha256,
    acknowledgedContentHashSchema: row.acknowledged_content_hash_schema,
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
