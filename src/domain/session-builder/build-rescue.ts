import type { Grade, Question } from "../questions/question-schema";
import { seededIndex } from "../story/seeded-pick";

type BuildRescueInput = Readonly<{
  grade: Grade;
  microSkill: string;
  bank: ReadonlyArray<Question>;
  contentMode: "published" | "pilot";
  excludeQuestionIds: ReadonlyArray<string>;
  seed: string;
}>;

function isAvailable(question: Question, mode: BuildRescueInput["contentMode"]): boolean {
  if (mode === "published") {
    return question.status === "published";
  }

  return question.status !== "disputed" && question.status !== "retired";
}

export function buildRescue(input: BuildRescueInput): Question | null {
  const excluded = new Set(input.excludeQuestionIds);
  const available = input.bank.filter(
    (question) =>
      question.grade === input.grade &&
      question.microSkill === input.microSkill &&
      !excluded.has(question.id) &&
      isAvailable(question, input.contentMode),
  );

  const rescueVariants = available.filter((question) => question.purpose === "rescue");
  if (rescueVariants.length > 0) {
    return rescueVariants[seededIndex(input.seed, rescueVariants.length)];
  }

  const easySameSkill = available.filter(
    (question) =>
      question.difficulty === 1 &&
      (question.purpose === "practice" || question.purpose === "diagnostic"),
  );
  if (easySameSkill.length > 0) {
    return easySameSkill[seededIndex(input.seed, easySameSkill.length)];
  }

  return null;
}
