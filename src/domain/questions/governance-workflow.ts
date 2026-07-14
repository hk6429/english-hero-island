import type { Question } from "./question-schema";
import type { ReviewRole } from "./publishing-gate";

export type GovernanceReview = Readonly<{
  questionId: string;
  questionVersion: number;
  reviewerId: string;
  reviewerRole: ReviewRole;
  reviewerApprovalStatus: "pending" | "approved" | "suspended";
  verdict: "approved" | "changes_requested";
  note: string;
  reviewedAt: string;
}>;

type ReviewSubmission = Readonly<{
  questionId: string;
  questionVersion: number;
  questionStatus: Question["status"];
  authorUserId: string | null;
  reviewerId: string;
  reviewerRole: ReviewRole;
  reviewerApprovalStatus: "pending" | "approved" | "suspended";
  existingReviews: ReadonlyArray<GovernanceReview>;
  verdict: GovernanceReview["verdict"];
  note: string;
}>;

type ReviewRejectionReason =
  | "version_not_reviewable"
  | "self_review_forbidden"
  | "reviewer_not_approved"
  | "english_teacher_required"
  | "duplicate_reviewer"
  | "review_note_too_short"
  | "change_note_too_short";

export type ReviewSubmissionDecision =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: ReviewRejectionReason }>;

export function evaluateReviewSubmission(
  submission: ReviewSubmission,
): ReviewSubmissionDecision {
  if (submission.questionStatus !== "in_review") {
    return { ok: false, reason: "version_not_reviewable" };
  }
  if (submission.authorUserId === submission.reviewerId) {
    return { ok: false, reason: "self_review_forbidden" };
  }
  if (submission.reviewerApprovalStatus !== "approved") {
    return { ok: false, reason: "reviewer_not_approved" };
  }
  if (submission.reviewerRole !== "english_teacher") {
    return { ok: false, reason: "english_teacher_required" };
  }
  if (
    submission.existingReviews.some(
      (review) =>
        review.questionId === submission.questionId &&
        review.questionVersion === submission.questionVersion &&
        review.reviewerId === submission.reviewerId,
    )
  ) {
    return { ok: false, reason: "duplicate_reviewer" };
  }
  if (submission.verdict === "changes_requested" && submission.note.trim().length < 4) {
    return { ok: false, reason: "change_note_too_short" };
  }
  if (submission.verdict === "approved" && submission.note.trim().length < 4) {
    return { ok: false, reason: "review_note_too_short" };
  }
  return { ok: true };
}

export function projectReviewStatus(
  reviews: ReadonlyArray<GovernanceReview>,
  target: Readonly<{ questionId: string; questionVersion: number }>,
): "in_review" | "reviewed" | "disputed" {
  const eligibleReviews = reviews.filter(
    (review) =>
      review.questionId === target.questionId &&
      review.questionVersion === target.questionVersion &&
      review.reviewerRole === "english_teacher" &&
      review.reviewerApprovalStatus === "approved",
  );

  if (eligibleReviews.some((review) => review.verdict === "changes_requested")) {
    return "disputed";
  }

  const approvedEnglishTeachers = new Set(
    eligibleReviews
      .filter((review) => review.verdict === "approved")
      .map((review) => review.reviewerId),
  );
  return approvedEnglishTeachers.size >= 2 ? "reviewed" : "in_review";
}

export function createQuestionRevision(
  previous: Question,
  input: Readonly<{
    authorId: string;
    authorName: string;
    changeSummary: string;
  }>,
): Question {
  const authorId = input.authorId.trim();
  const authorName = input.authorName.trim();
  if (!authorId || !authorName) {
    throw new Error("新版本必須記錄作者身分。");
  }
  if (input.changeSummary.trim().length < 4) {
    throw new Error("新版本必須記錄至少四個字的修改摘要。");
  }

  const content = { ...previous };
  delete content.reviewedAt;
  delete content.publishedAt;
  return {
    ...content,
    version: previous.version + 1,
    supersedesVersion: previous.version,
    changeSummary: input.changeSummary.trim(),
    status: "draft",
    author: {
      id: authorId,
      displayName: authorName,
    },
    reviewers: [],
  };
}
