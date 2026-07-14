import type { Grade, Question } from "../questions/question-schema";

type BuildReviewInput = Readonly<{
  grade: Grade;
  microSkill: string;
  bank: ReadonlyArray<Question>;
  contentMode: "published" | "pilot";
  excludeQuestionIds: ReadonlyArray<string>;
  excludeVariantGroups: ReadonlyArray<string>;
}>;

type ReviewBuildResult =
  | Readonly<{ ok: true; pilotContent: boolean; question: Question }>
  | Readonly<{ ok: false; pilotContent: boolean; reason: "content_gap" }>;

export function buildReview(input: BuildReviewInput): ReviewBuildResult {
  const excludedQuestions = new Set(input.excludeQuestionIds);
  const excludedVariants = new Set(input.excludeVariantGroups);
  const question = input.bank.find(
    (candidate) =>
      candidate.grade === input.grade &&
      candidate.microSkill === input.microSkill &&
      candidate.purpose === "review" &&
      !excludedQuestions.has(candidate.id) &&
      !excludedVariants.has(candidate.variantGroup) &&
      (input.contentMode === "published"
        ? candidate.status === "published"
        : candidate.status !== "disputed" && candidate.status !== "retired"),
  );

  if (!question) {
    return {
      ok: false,
      pilotContent: input.contentMode === "pilot",
      reason: "content_gap",
    };
  }

  return {
    ok: true,
    pilotContent: input.contentMode === "pilot",
    question,
  };
}
