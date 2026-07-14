import type { Grade, Question } from "../questions/question-schema";
import { PRIORITY_MICRO_SKILLS } from "./grade-priorities";

type BuildDiagnosticInput = Readonly<{
  grade: Grade;
  bank: ReadonlyArray<Question>;
  contentMode: "published" | "pilot";
}>;

type DiagnosticSuccess = Readonly<{
  ok: true;
  pilotContent: boolean;
  questions: Question[];
}>;

type DiagnosticFailure = Readonly<{
  ok: false;
  pilotContent: boolean;
  reason: "content_gap";
  missingMicroSkills: string[];
}>;

export type DiagnosticBuildResult = DiagnosticSuccess | DiagnosticFailure;

function isAvailable(question: Question, mode: BuildDiagnosticInput["contentMode"]): boolean {
  if (mode === "published") {
    return question.status === "published";
  }

  return question.status !== "disputed" && question.status !== "retired";
}

export function buildDiagnostic(input: BuildDiagnosticInput): DiagnosticBuildResult {
  const requiredMicroSkills = PRIORITY_MICRO_SKILLS[input.grade];
  const available = input.bank.filter(
    (question) =>
      question.grade === input.grade &&
      question.purpose === "diagnostic" &&
      isAvailable(question, input.contentMode),
  );
  const questions = requiredMicroSkills
    .map((microSkill) => available.find((question) => question.microSkill === microSkill))
    .filter((question): question is Question => Boolean(question));
  const selectedMicroSkills = new Set(questions.map((question) => question.microSkill));
  const missingMicroSkills = requiredMicroSkills.filter(
    (microSkill) => !selectedMicroSkills.has(microSkill),
  );

  if (missingMicroSkills.length > 0) {
    return {
      ok: false,
      pilotContent: input.contentMode === "pilot",
      reason: "content_gap",
      missingMicroSkills,
    };
  }

  return {
    ok: true,
    pilotContent: input.contentMode === "pilot",
    questions,
  };
}
