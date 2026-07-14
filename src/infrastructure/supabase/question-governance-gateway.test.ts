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

describe("question governance gateway", () => {
  it("maps a protected frozen review queue without losing answer evidence", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
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
            audio: { src: "/audio/kite.mp3", transcript: "Is this a kite?" },
            image: { src: "/images/kite.webp", alt: "一隻風箏" },
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
            locked_at: "2026-07-14T07:00:00.000Z",
            created_at: "2026-07-14T06:00:00.000Z",
            approval_count: 1,
            change_request_count: 0,
          },
        ],
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
        audio: { src: "/audio/kite.mp3", transcript: "Is this a kite?" },
        image: { src: "/images/kite.webp", alt: "一隻風箏" },
        source: expect.objectContaining({
          url: "https://example.edu/question-source",
        }),
        correctOptionId: "yes",
        authorName: "內容編輯 A",
        lockedAt: "2026-07-14T07:00:00.000Z",
        approvalCount: 1,
        changeRequestCount: 0,
      }),
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_question_review_queue");
  });

  it("submits the exact immutable version, criteria, verdict, and note", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: questionId,
            question_version: 2,
            question_status: "reviewed",
            approval_count: 2,
            change_request_count: 0,
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
      questionId,
      questionVersion: 2,
      status: "reviewed",
      approvalCount: 2,
      changeRequestCount: 0,
      reviewedAt: "2026-07-14T08:00:00.000Z",
      reviewRecordedAt: "2026-07-14T08:00:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("submit_question_review", {
      p_question_id: questionId,
      p_question_version: 2,
      p_verdict: "approved",
      p_criteria: submission.criteria,
      p_note: "內容正確",
    });
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
