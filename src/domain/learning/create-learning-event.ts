import type { CreateLearningEventInput, LearningEvent, LearningOutcome } from "./types";

function deriveOutcome(input: CreateLearningEventInput): LearningOutcome {
  if (input.response.rescueVariantCorrect) {
    return "rescued";
  }

  const firstAnswerIsCorrect =
    input.response.firstSelectedOptionId === input.question.correctOptionId;

  if (firstAnswerIsCorrect) {
    return input.response.hintsUsed === 0 ? "independent_correct" : "assisted_correct";
  }

  if (input.response.finalSelectedOptionId === input.question.correctOptionId) {
    return "assisted_correct";
  }

  return "pending_support";
}

export function createLearningEvent(input: CreateLearningEventInput): LearningEvent {
  return Object.freeze({
    id: input.eventId,
    type: "question_completed" as const,
    outcome: deriveOutcome(input),
    studentId: input.studentId,
    sessionId: input.sessionId,
    questionId: input.question.id,
    questionVersion: input.question.version,
    microSkill: input.question.microSkill,
    variantGroup: input.question.variantGroup,
    firstSelectedOptionId: input.response.firstSelectedOptionId,
    hintsUsed: input.response.hintsUsed,
    toolUsed: input.response.toolUsed,
    rescueVariantCorrect: input.response.rescueVariantCorrect,
    occurredAt: input.occurredAt,
    studyDate: input.studyDate,
  });
}
