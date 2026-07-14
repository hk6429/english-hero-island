import { describe, expect, it } from "vitest";
import { questionSchema } from "./question-schema";
import { makeQuestion } from "@/test/fixtures/question";
import {
  createQuestionRevision,
  evaluateReviewSubmission,
  projectReviewStatus,
  type GovernanceReview,
} from "./governance-workflow";

const validDraftQuestion = makeQuestion({ id: "g3-cvc-diagnostic-01" });
const reviewTarget = {
  questionId: validDraftQuestion.id,
  questionVersion: 1,
} as const;

const approvedReview = (
  reviewerId: string,
  overrides: Partial<GovernanceReview> = {},
): GovernanceReview => ({
  questionId: validDraftQuestion.id,
  questionVersion: 1,
  reviewerId,
  reviewerRole: "english_teacher",
  reviewerApprovalStatus: "approved",
  verdict: "approved",
  note: "正解、解析與提示皆正確。",
  reviewedAt: "2026-07-14T08:00:00.000Z",
  ...overrides,
});

describe("question governance workflow", () => {
  it("allows only a distinct approved English teacher to review a frozen version", () => {
    expect(
      evaluateReviewSubmission({
        questionId: validDraftQuestion.id,
        questionVersion: 1,
        questionStatus: "in_review",
        authorUserId: "author-user",
        reviewerId: "teacher-b",
        reviewerRole: "english_teacher",
        reviewerApprovalStatus: "approved",
        existingReviews: [approvedReview("teacher-a")],
        verdict: "approved",
        note: "正解、解析與提示皆正確。",
      }),
    ).toEqual({ ok: true });

    expect(
      evaluateReviewSubmission({
        questionId: validDraftQuestion.id,
        questionVersion: 1,
        questionStatus: "in_review",
        authorUserId: "author-user",
        reviewerId: "teacher-a",
        reviewerRole: "english_teacher",
        reviewerApprovalStatus: "approved",
        existingReviews: [approvedReview("teacher-a")],
        verdict: "approved",
        note: "再次核准。",
      }),
    ).toEqual({ ok: false, reason: "duplicate_reviewer" });
  });

  it("does not treat the same teacher's review of an older version as a duplicate", () => {
    expect(
      evaluateReviewSubmission({
        questionId: validDraftQuestion.id,
        questionVersion: 2,
        questionStatus: "in_review",
        authorUserId: "author-user",
        reviewerId: "teacher-a",
        reviewerRole: "english_teacher",
        reviewerApprovalStatus: "approved",
        existingReviews: [approvedReview("teacher-a")],
        verdict: "approved",
        note: "第二版內容與解析皆正確。",
      }),
    ).toEqual({ ok: true });
  });

  it("blocks self-review, unapproved accounts, and non-English reviewers", () => {
    const base = {
      questionId: validDraftQuestion.id,
      questionVersion: 1,
      questionStatus: "in_review" as const,
      authorUserId: "author-user",
      reviewerId: "author-user",
      reviewerRole: "english_teacher" as const,
      reviewerApprovalStatus: "approved" as const,
      existingReviews: [],
      verdict: "approved" as const,
      note: "內容正確。",
    };

    expect(evaluateReviewSubmission(base)).toEqual({
      ok: false,
      reason: "self_review_forbidden",
    });
    expect(
      evaluateReviewSubmission({
        ...base,
        reviewerId: "teacher-a",
        reviewerApprovalStatus: "pending",
      }),
    ).toEqual({ ok: false, reason: "reviewer_not_approved" });
    expect(
      evaluateReviewSubmission({
        ...base,
        reviewerId: "editor-a",
        reviewerRole: "content_editor",
      }),
    ).toEqual({ ok: false, reason: "english_teacher_required" });
  });

  it("requires a concrete note when requesting changes", () => {
    expect(
      evaluateReviewSubmission({
        questionId: validDraftQuestion.id,
        questionVersion: 1,
        questionStatus: "in_review",
        authorUserId: "author-user",
        reviewerId: "teacher-a",
        reviewerRole: "english_teacher",
        reviewerApprovalStatus: "approved",
        existingReviews: [],
        verdict: "changes_requested",
        note: "錯",
      }),
    ).toEqual({ ok: false, reason: "change_note_too_short" });
  });

  it("marks two distinct approvals reviewed and any change request disputed", () => {
    expect(projectReviewStatus([approvedReview("teacher-a")], reviewTarget)).toBe(
      "in_review",
    );
    expect(
      projectReviewStatus([
        approvedReview("teacher-a"),
        approvedReview("teacher-b"),
      ], reviewTarget),
    ).toBe("reviewed");
    expect(
      projectReviewStatus([
        approvedReview("teacher-a"),
        approvedReview("teacher-b", {
          verdict: "changes_requested",
          note: "解析把 is 與 are 的主詞搭配寫反。",
        }),
      ], reviewTarget),
    ).toBe("disputed");
  });

  it("does not let an unapproved or non-English reviewer force a dispute", () => {
    expect(
      projectReviewStatus(
        [
          approvedReview("teacher-a"),
          approvedReview("teacher-b"),
          approvedReview("editor-a", {
            reviewerRole: "content_editor",
            verdict: "changes_requested",
            note: "要求修改，但此帳號不具英語教師複核資格。",
          }),
          approvedReview("teacher-c", {
            reviewerApprovalStatus: "suspended",
            verdict: "changes_requested",
            note: "要求修改，但此帳號已停權。",
          }),
        ],
        reviewTarget,
      ),
    ).toBe("reviewed");
  });

  it("projects status from only the requested question version", () => {
    expect(
      projectReviewStatus(
        [
          approvedReview("teacher-a"),
          approvedReview("teacher-b", { questionVersion: 2 }),
        ],
        { questionId: validDraftQuestion.id, questionVersion: 2 },
      ),
    ).toBe("in_review");
  });

  it("creates a new draft version without copying signatures or publication dates", () => {
    const revision = createQuestionRevision(
      {
        ...validDraftQuestion,
        status: "disputed",
        reviewedAt: "2026-07-14T09:00:00.000Z",
        publishedAt: "2026-07-14T10:00:00.000Z",
        reviewers: [
          {
            id: "teacher-a",
            role: "english_teacher",
            reviewedAt: "2026-07-14T08:00:00.000Z",
          },
        ],
      },
      { authorId: "editor-b", authorName: "內容編輯 B", changeSummary: "修正解析" },
    );

    expect(revision).toMatchObject({
      id: validDraftQuestion.id,
      version: 2,
      supersedesVersion: 1,
      changeSummary: "修正解析",
      status: "draft",
      author: { id: "editor-b", displayName: "內容編輯 B" },
      reviewers: [],
    });
    expect(revision).not.toHaveProperty("reviewedAt");
    expect(revision).not.toHaveProperty("publishedAt");
    expect(questionSchema.safeParse(revision).success).toBe(true);
  });

  it("refuses to create a revision without an accountable author", () => {
    expect(() =>
      createQuestionRevision(validDraftQuestion, {
        authorId: " ",
        authorName: "內容編輯 B",
        changeSummary: "修正解析",
      }),
    ).toThrow("新版本必須記錄作者身分。");
  });
});
