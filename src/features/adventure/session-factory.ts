import { buildDiagnostic } from "@/domain/session-builder/build-diagnostic";
import { buildMission } from "@/domain/session-builder/build-mission";
import { buildReview } from "@/domain/session-builder/build-review";
import type { Grade, Question } from "@/domain/questions/question-schema";
import type { ActiveSession } from "@/infrastructure/progress/progress-types";
import { FOCUS_MICRO_SKILL, MICRO_SKILLS_BY_GRADE } from "./content-map";

function baseSession(
  id: string,
  kind: ActiveSession["kind"],
  microSkill: string | null,
  questionIds: string[],
  phase: ActiveSession["phase"],
  reviewFallbackGrade: Grade | null = null,
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
    reviewFallbackGrade,
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

/**
 * 這年級這項能力的練功／Boss 題不足時，往前借用較低年級已驗證足額的重點能力
 * （只用既有題目，不臨時產生新題目），並回傳借用的年級供 UI 誠實標示「往前複習」。
 */
function buildMissionWithGradeFallback(
  grade: Grade,
  microSkill: string,
  bank: ReadonlyArray<Question>,
  excludeQuestionIds: ReadonlyArray<string>,
): Readonly<{
  result: ReturnType<typeof buildMission>;
  usedMicroSkill: string;
  fallbackFromGrade: Grade | null;
}> {
  const primary = buildMission({ grade, microSkill, bank, contentMode: "pilot", excludeQuestionIds });
  if (primary.ok) {
    return { result: primary, usedMicroSkill: microSkill, fallbackFromGrade: null };
  }

  // 排除已作答題目後題量不足時，先允許同一項能力重複出題，勝過直接跳到較低年級。
  const withoutExclusion = buildMission({
    grade,
    microSkill,
    bank,
    contentMode: "pilot",
    excludeQuestionIds: [],
  });
  if (withoutExclusion.ok) {
    return { result: withoutExclusion, usedMicroSkill: microSkill, fallbackFromGrade: null };
  }

  for (let candidateGrade = grade - 1; candidateGrade >= 3; candidateGrade -= 1) {
    const fallbackMicroSkill = FOCUS_MICRO_SKILL[candidateGrade as Grade];
    const fallback = buildMission({
      grade: candidateGrade as Grade,
      microSkill: fallbackMicroSkill,
      bank,
      contentMode: "pilot",
      excludeQuestionIds: [],
    });
    if (fallback.ok) {
      return {
        result: fallback,
        usedMicroSkill: fallbackMicroSkill,
        fallbackFromGrade: candidateGrade as Grade,
      };
    }
  }

  return { result: withoutExclusion, usedMicroSkill: microSkill, fallbackFromGrade: null };
}

/**
 * 從這年級這學期涵蓋的能力裡，篩出練功／Boss 題目前足額、真的能開任務的技能，
 * 依「已完成任務數」輪流指派下一個聚焦技能；沒有任何技能就緒時退回原本的重點能力。
 */
export function selectMissionMicroSkill(
  grade: Grade,
  bank: ReadonlyArray<Question>,
  completedMissionCount: number,
): string {
  const candidates = MICRO_SKILLS_BY_GRADE[grade];
  const ready = candidates.filter(
    (microSkill) =>
      buildMission({ grade, microSkill, bank, contentMode: "pilot", excludeQuestionIds: [] }).ok,
  );
  if (ready.length === 0) return FOCUS_MICRO_SKILL[grade];
  return ready[completedMissionCount % ready.length];
}

export function createMissionSession(
  grade: Grade,
  microSkill: string,
  bank: ReadonlyArray<Question>,
  id: string,
  excludeQuestionIds: ReadonlyArray<string> = [],
): ActiveSession | null {
  const { result, usedMicroSkill, fallbackFromGrade } = buildMissionWithGradeFallback(
    grade,
    microSkill,
    bank,
    excludeQuestionIds,
  );
  if (!result.ok) return null;
  return baseSession(
    id,
    "mission",
    usedMicroSkill,
    [...result.practice, result.boss].map((question) => question.id),
    "practice",
    fallbackFromGrade,
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
