import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { QuestionReviewSubmission } from "@/components/governance/QuestionReviewCard";
import {
  listQuestionReviewQueueWithSupabase,
  publishQuestionVersionWithSupabase,
  reportQuestionDisputeWithSupabase,
  retireQuestionVersionWithSupabase,
  submitQuestionReviewWithSupabase,
} from "./question-governance-gateway";

const questionId = "g4-yes-no-practice-01";
const frozenContentSha256 = "a".repeat(64);
const assetSha256 = "b".repeat(64);
const assetLocator = `/assets/question-assets/${assetSha256}.mp3`;

function validQueueRow() {
  return {
    question_id: questionId,
    question_version: 2,
    question_status: "in_review",
    grade: 4,
    skill: "grammar",
    indicator: "能使用 Yes／No 問句",
    micro_skill: "yes-no-questions",
    difficulty: 2,
    modality: "audio",
    question_type: "listening_choice",
    purpose: "practice",
    prompt: "Is this a kite?",
    audio: { src: assetLocator, transcript: "Is this a kite?" },
    image: null,
    options: [
      { id: "yes", text: "Yes, it is." },
      { id: "no", text: "No, it isn't." },
    ],
    correct_option_id: "yes",
    explanation: "看到單數物品，要用 Yes, it is. 回答。",
    hints: ["先看問句開頭是不是 Is。"],
    variant_group: "g4-yes-no-kite",
    source: {
      kind: "original",
      url: "https://example.edu/question-source",
      note: "英語英雄島原創題",
      usageRights: "original-for-project",
    },
    author: { id: "editor-a", displayName: "內容編輯 A" },
    created_by: "11111111-1111-4111-8111-111111111111",
    supersedes_version: 1,
    change_summary: "修正問句與解析",
    content_sha256: frozenContentSha256,
    content_hash_schema: "question-review-snapshot-pg-jsonb-text-v1",
    asset_evidence: [
      {
        assetKind: "audio",
        assetLocator,
        assetSha256,
        byteLength: 12_345,
        mimeType: "audio/mpeg",
        rightsSourceKind: "licensed",
        rightsUsageRights: "licensed-for-publication",
        rightsEvidenceLocator: `licensed/${"c".repeat(64)}.md`,
        rightsEvidenceSha256: "c".repeat(64),
        rightsEvidenceByteLength: 456,
        manifestSha256: "d".repeat(64),
        questionBankSha256: "e".repeat(64),
        verificationSchema: "question-asset-byte-receipt-v1",
        verifiedAt: "2026-07-14T07:30:00+00:00",
      },
    ],
    locked_at: "2026-07-14T07:00:00.000Z",
    created_at: "2026-07-14T06:00:00.000Z",
  };
}

describe("question governance gateway", () => {
  it("maps a protected frozen review queue without losing answer evidence", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [validQueueRow()],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(listQuestionReviewQueueWithSupabase(client)).resolves.toEqual([
      expect.objectContaining({
        id: questionId,
        version: 2,
        grade: 4,
        microSkill: "yes-no-questions",
        modality: "audio",
        audio: { src: assetLocator, transcript: "Is this a kite?" },
        image: null,
        source: expect.objectContaining({
          url: "https://example.edu/question-source",
        }),
        correctOptionId: "yes",
        authorName: "內容編輯 A",
        contentSha256: frozenContentSha256,
        contentHashSchema: "question-review-snapshot-pg-jsonb-text-v1",
        assetEvidence: [
          expect.objectContaining({
            assetKind: "audio",
            assetSha256,
            byteLength: 12_345,
            rightsEvidenceSha256: "c".repeat(64),
          }),
        ],
        lockedAt: "2026-07-14T07:00:00.000Z",
      }),
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_question_review_queue");
  });

  it.each([
    {
      label: "missing evidence",
      overrides: { asset_evidence: [] },
    },
    {
      label: "wrong kind",
      overrides: {
        asset_evidence: [
          { ...validQueueRow().asset_evidence[0], assetKind: "image" },
        ],
      },
    },
    {
      label: "mismatched locator",
      overrides: {
        asset_evidence: [
          {
            ...validQueueRow().asset_evidence[0],
            assetLocator: `/assets/question-assets/${"f".repeat(64)}.mp3`,
          },
        ],
      },
    },
  ])("rejects a media queue row with $label", async ({ overrides }) => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ ...validQueueRow(), ...overrides }],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(listQuestionReviewQueueWithSupabase(client)).rejects.toThrow();
  });

  it("submits the exact immutable version, criteria, verdict, and note", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            review_id: "22222222-2222-4222-8222-222222222222",
            question_id: questionId,
            question_version: 2,
            question_status: "reviewed",
            approval_count: 2,
            change_request_count: 0,
            acknowledged_content_sha256: frozenContentSha256,
            acknowledged_content_hash_schema:
              "question-review-snapshot-pg-jsonb-text-v1",
            reviewed_at: "2026-07-14T08:00:00.000Z",
            review_recorded_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;
    const submission: QuestionReviewSubmission = {
      questionId,
      questionVersion: 2,
      expectedContentSha256: frozenContentSha256,
      expectedContentHashSchema: "question-review-snapshot-pg-jsonb-text-v1",
      verdict: "approved",
      note: "內容正確",
      criteria: {
        english_correct: true,
        answer_unique: true,
        explanation_correct: true,
        hint_safe: true,
        asset_consistent: true,
        rights_clear: true,
        age_appropriate: true,
      },
    };

    await expect(
      submitQuestionReviewWithSupabase(client, submission),
    ).resolves.toEqual({
      reviewId: "22222222-2222-4222-8222-222222222222",
      questionId,
      questionVersion: 2,
      status: "reviewed",
      approvalCount: 2,
      changeRequestCount: 0,
      acknowledgedContentSha256: frozenContentSha256,
      acknowledgedContentHashSchema:
        "question-review-snapshot-pg-jsonb-text-v1",
      reviewedAt: "2026-07-14T08:00:00.000Z",
      reviewRecordedAt: "2026-07-14T08:00:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("submit_question_review", {
      p_question_id: questionId,
      p_question_version: 2,
      p_expected_content_sha256: frozenContentSha256,
      p_expected_content_hash_schema:
        "question-review-snapshot-pg-jsonb-text-v1",
      p_verdict: "approved",
      p_criteria: submission.criteria,
      p_note: "內容正確",
    });
  });

  it("rejects a success response that acknowledges a different frozen receipt", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            review_id: "22222222-2222-4222-8222-222222222222",
            question_id: questionId,
            question_version: 2,
            question_status: "in_review",
            approval_count: 1,
            change_request_count: 0,
            acknowledged_content_sha256: "b".repeat(64),
            acknowledged_content_hash_schema:
              "question-review-snapshot-pg-jsonb-text-v1",
            reviewed_at: null,
            review_recorded_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      submitQuestionReviewWithSupabase(client, {
        questionId,
        questionVersion: 2,
        expectedContentSha256: frozenContentSha256,
        expectedContentHashSchema: "question-review-snapshot-pg-jsonb-text-v1",
        verdict: "approved",
        note: "內容正確",
        criteria: {
          english_correct: true,
          answer_unique: true,
          explanation_correct: true,
          hint_safe: true,
          asset_consistent: true,
          rights_clear: true,
          age_appropriate: true,
        },
      }),
    ).rejects.toThrow("伺服器保存的內容確認收據與送出內容不一致");
  });

  it("rejects a success response for a different question version", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            review_id: "22222222-2222-4222-8222-222222222222",
            question_id: "different-question",
            question_version: 3,
            question_status: "in_review",
            approval_count: 1,
            change_request_count: 0,
            acknowledged_content_sha256: frozenContentSha256,
            acknowledged_content_hash_schema:
              "question-review-snapshot-pg-jsonb-text-v1",
            reviewed_at: null,
            review_recorded_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      submitQuestionReviewWithSupabase(client, {
        questionId,
        questionVersion: 2,
        expectedContentSha256: frozenContentSha256,
        expectedContentHashSchema: "question-review-snapshot-pg-jsonb-text-v1",
        verdict: "changes_requested",
        note: "請修正情境",
        criteria: {
          english_correct: true,
          answer_unique: false,
          explanation_correct: true,
          hint_safe: true,
          asset_consistent: true,
          rights_clear: true,
          age_appropriate: true,
        },
      }),
    ).rejects.toThrow("伺服器回傳的複核題目版本與送出內容不一致");
  });

  it("keeps publication, dispute, and retirement as explicit separate actions", async () => {
    const client = {
      rpc: vi.fn().mockImplementation(async (name: string) => {
        if (name === "publish_question_version") {
          return {
            data: [
              {
                question_id: questionId,
                question_version: 2,
                question_status: "published",
                published_at: "2026-07-14T09:00:00.000Z",
              },
            ],
            error: null,
          };
        }
        if (name === "report_question_dispute") {
          return {
            data: [
              {
                question_id: questionId,
                question_version: 2,
                question_status: "disputed",
                disputed_at: "2026-07-14T10:00:00.000Z",
              },
            ],
            error: null,
          };
        }
        return {
          data: [
            {
              question_id: questionId,
              question_version: 2,
              question_status: "retired",
              retired_at: "2026-07-14T11:00:00.000Z",
            },
          ],
          error: null,
        };
      }),
    } as unknown as SupabaseClient;

    await expect(
      publishQuestionVersionWithSupabase(client, questionId, 2, "正式發布"),
    ).resolves.toEqual(
      expect.objectContaining({ status: "published", questionId }),
    );
    await expect(
      reportQuestionDisputeWithSupabase(client, questionId, 2, "發現音訊不一致"),
    ).resolves.toEqual(
      expect.objectContaining({ status: "disputed", questionId }),
    );
    await expect(
      retireQuestionVersionWithSupabase(client, questionId, 2, "已有新版取代"),
    ).resolves.toEqual(
      expect.objectContaining({ status: "retired", questionId }),
    );

    expect(client.rpc).toHaveBeenNthCalledWith(1, "publish_question_version", {
      p_question_id: questionId,
      p_question_version: 2,
      p_note: "正式發布",
    });
    expect(client.rpc).toHaveBeenNthCalledWith(2, "report_question_dispute", {
      p_question_id: questionId,
      p_question_version: 2,
      p_note: "發現音訊不一致",
    });
    expect(client.rpc).toHaveBeenNthCalledWith(3, "retire_question_version", {
      p_question_id: questionId,
      p_question_version: 2,
      p_note: "已有新版取代",
    });
  });

  it("surfaces protected RPC failures instead of fabricating local success", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "approved English teacher required" },
      }),
    } as unknown as SupabaseClient;

    await expect(listQuestionReviewQueueWithSupabase(client)).rejects.toThrow(
      "approved English teacher required",
    );
  });
});
