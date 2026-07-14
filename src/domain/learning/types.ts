export type LearningOutcome =
  | "independent_correct"
  | "assisted_correct"
  | "rescued"
  | "pending_support";

export type HintToolUsed = "sound-lens" | "word-bridge" | "example-card";

export type LearningEvent = Readonly<{
  id: string;
  type: "question_completed";
  outcome: LearningOutcome;
  studentId: string;
  sessionId: string;
  questionId: string;
  questionVersion: number;
  microSkill: string;
  variantGroup: string;
  firstSelectedOptionId: string;
  hintsUsed: number;
  toolUsed: HintToolUsed | null;
  rescueVariantCorrect: boolean;
  occurredAt: string;
  studyDate: string;
}>;

export type CreateLearningEventInput = Readonly<{
  eventId: string;
  studentId: string;
  sessionId: string;
  occurredAt: string;
  studyDate: string;
  question: Readonly<{
    id: string;
    version: number;
    microSkill: string;
    variantGroup: string;
    correctOptionId: string;
  }>;
  response: Readonly<{
    firstSelectedOptionId: string;
    finalSelectedOptionId: string;
    hintsUsed: number;
    toolUsed: HintToolUsed | null;
    rescueVariantCorrect: boolean;
  }>;
}>;
