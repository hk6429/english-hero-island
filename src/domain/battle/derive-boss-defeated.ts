import type { LearningEvent } from "@/domain/learning/types";
import type { Question } from "@/domain/questions/question-schema";

export function deriveBossDefeated(
  sessionEvents: ReadonlyArray<LearningEvent>,
  bank: ReadonlyArray<Question>,
): boolean {
  const bossQuestionIds = new Set(
    bank.filter((question) => question.purpose === "boss").map((question) => question.id),
  );

  return sessionEvents.some(
    (event) => bossQuestionIds.has(event.questionId) && event.outcome !== "pending_support",
  );
}
