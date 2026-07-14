import { buildDiagnostic } from "@/domain/session-builder/build-diagnostic";
import { buildMission } from "@/domain/session-builder/build-mission";
import { buildReview } from "@/domain/session-builder/build-review";
import type { Grade, Question } from "@/domain/questions/question-schema";
import type { ActiveSession } from "@/infrastructure/progress/progress-types";

function baseSession(
  id: string,
  kind: ActiveSession["kind"],
  microSkill: string | null,
  questionIds: string[],
  phase: ActiveSession["phase"],
): ActiveSession {
  return {
    id,
    kind,
    microSkill,
    questionIds,
    currentIndex: 0,
    phase,
    hintsUsed: 0,
    selectedTool: null,
    selectedRoute: null,
    battle: {
      armor: questionIds.length,
      shields: 3,
      combo: 0,
      rescueActive: false,
    },
    outcomes: [],
  };
}

export function createDiagnosticSession(
  grade: Grade,
  bank: ReadonlyArray<Question>,
  id: string,
): ActiveSession | null {
  const result = buildDiagnostic({ grade, bank, contentMode: "pilot" });
  if (!result.ok) return null;
  return baseSession(id, "diagnostic", null, result.questions.map((question) => question.id), "diagnostic");
}

export function createMissionSession(
  grade: Grade,
  microSkill: string,
  bank: ReadonlyArray<Question>,
  id: string,
): ActiveSession | null {
  const result = buildMission({
    grade,
    microSkill,
    bank,
    contentMode: "pilot",
    excludeQuestionIds: [],
  });
  if (!result.ok) return null;
  return baseSession(
    id,
    "mission",
    microSkill,
    [...result.practice, result.boss].map((question) => question.id),
    "practice",
  );
}

export function createReviewSession(
  grade: Grade,
  microSkill: string,
  bank: ReadonlyArray<Question>,
  id: string,
  excludeQuestionIds: ReadonlyArray<string>,
  excludeVariantGroups: ReadonlyArray<string>,
): ActiveSession | null {
  const result = buildReview({
    grade,
    microSkill,
    bank,
    contentMode: "pilot",
    excludeQuestionIds,
    excludeVariantGroups,
  });
  if (!result.ok) return null;
  return baseSession(id, "review", microSkill, [result.question.id], "review");
}
