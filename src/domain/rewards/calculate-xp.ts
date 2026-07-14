import type { LearningEvent } from "../learning/types";

export type XpAward = Readonly<{
  completion: number;
  learning: number;
  total: number;
  duplicate: boolean;
}>;

const DAY_IN_MS = 86_400_000;

function daysBetween(earlier: string, later: string): number {
  return Math.floor(
    (Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) /
      DAY_IN_MS,
  );
}

export function calculateXp(
  event: LearningEvent,
  history: ReadonlyArray<LearningEvent>,
): XpAward {
  const duplicate = history.some(
    (previous) =>
      previous.id === event.id ||
      (previous.questionId === event.questionId && previous.studyDate === event.studyDate),
  );

  if (duplicate) {
    return { completion: 0, learning: 0, total: 0, duplicate: true };
  }

  const completion = 5;
  const latestEarlierIndependentEvidence = history
    .filter(
      (previous) =>
        previous.outcome === "independent_correct" &&
        previous.microSkill === event.microSkill &&
        previous.questionId !== event.questionId &&
        previous.studyDate < event.studyDate,
    )
    .sort((left, right) => right.studyDate.localeCompare(left.studyDate))[0];

  const independentBonus = latestEarlierIndependentEvidence
    ? daysBetween(latestEarlierIndependentEvidence.studyDate, event.studyDate) >= 3
      ? 15
      : 10
    : 5;

  const learning =
    event.outcome === "independent_correct"
      ? independentBonus
      : event.outcome === "assisted_correct"
        ? 2
        : 0;

  return {
    completion,
    learning,
    total: completion + learning,
    duplicate: false,
  };
}
