export type ReviewRole = "english_teacher" | "content_editor" | "administrator";

export type PublishingCandidate = {
  status: "draft" | "in_review" | "reviewed" | "published" | "disputed" | "retired";
  sourceKind: "original" | "licensed" | "research_reference";
  usageRights: string;
  reviewers: ReadonlyArray<{
    id: string;
    role: ReviewRole;
    reviewedAt: string;
  }>;
};

export type PublishingDecision =
  | { allowed: true; reasons: [] }
  | { allowed: false; reasons: string[] };

export function canPublishQuestion(candidate: PublishingCandidate): PublishingDecision {
  if (candidate.status !== "reviewed" && candidate.status !== "published") {
    return {
      allowed: false,
      reasons: ["題目必須先完成複核"],
    };
  }

  const englishTeacherIds = new Set(
    candidate.reviewers
      .filter((reviewer) => reviewer.role === "english_teacher")
      .map((reviewer) => reviewer.id),
  );

  if (englishTeacherIds.size < 2) {
    return {
      allowed: false,
      reasons: ["至少需要兩位不同的英語教師完成複核"],
    };
  }

  if (candidate.sourceKind === "research_reference") {
    return {
      allowed: false,
      reasons: ["研究參考資料不可直接發布"],
    };
  }

  if (
    candidate.sourceKind === "licensed" &&
    candidate.usageRights !== "licensed-for-publication"
  ) {
    return {
      allowed: false,
      reasons: ["授權範圍不允許公開發布"],
    };
  }

  return { allowed: true, reasons: [] };
}
