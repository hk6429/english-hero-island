import type { Grade, Question } from "../questions/question-schema";

type BuildMissionInput = Readonly<{
  grade: Grade;
  microSkill: string;
  bank: ReadonlyArray<Question>;
  contentMode: "published" | "pilot";
  excludeQuestionIds: ReadonlyArray<string>;
}>;

type MissionSuccess = Readonly<{
  ok: true;
  pilotContent: boolean;
  practice: Question[];
  boss: Question;
}>;

type MissionFailure = Readonly<{
  ok: false;
  pilotContent: boolean;
  reason: "content_gap";
  missingPractice: number;
  missingBoss: boolean;
}>;

export type MissionBuildResult = MissionSuccess | MissionFailure;

function isAvailable(question: Question, mode: BuildMissionInput["contentMode"]): boolean {
  if (mode === "published") {
    return question.status === "published";
  }

  return question.status !== "disputed" && question.status !== "retired";
}

function uniqueSurfaces(questions: ReadonlyArray<Question>): Question[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.variantGroup)) {
      return false;
    }
    seen.add(question.variantGroup);
    return true;
  });
}

export function buildMission(input: BuildMissionInput): MissionBuildResult {
  const excluded = new Set(input.excludeQuestionIds);
  const available = input.bank.filter(
    (question) =>
      question.grade === input.grade &&
      question.microSkill === input.microSkill &&
      !excluded.has(question.id) &&
      isAvailable(question, input.contentMode),
  );
  const practice = uniqueSurfaces(
    available.filter((question) => question.purpose === "practice"),
  ).slice(0, 5);
  const usedSurfaces = new Set(practice.map((question) => question.variantGroup));
  const boss = available.find(
    (question) => question.purpose === "boss" && !usedSurfaces.has(question.variantGroup),
  );

  if (practice.length < 3 || !boss) {
    return {
      ok: false,
      pilotContent: input.contentMode === "pilot",
      reason: "content_gap",
      missingPractice: Math.max(0, 3 - practice.length),
      missingBoss: !boss,
    };
  }

  return {
    ok: true,
    pilotContent: input.contentMode === "pilot",
    practice,
    boss,
  };
}
