import type { LearningEvent, LearningOutcome } from "../learning/types";
import type { Grade } from "../questions/question-schema";
import { PRIORITY_MICRO_SKILLS } from "./grade-priorities";

const OUTCOME_STRENGTH: Readonly<Record<LearningOutcome, number>> = {
  pending_support: 0,
  rescued: 1,
  assisted_correct: 2,
  independent_correct: 3,
};

export type MissionRecommendation = Readonly<{
  microSkill: string;
  evidenceOutcome: LearningOutcome | "unassessed";
  reason: string;
}>;

export function recommendMission(
  grade: Grade,
  events: ReadonlyArray<LearningEvent>,
): MissionRecommendation {
  const priorities = PRIORITY_MICRO_SKILLS[grade];
  const evidence = priorities.map((microSkill) => {
    const outcomes = events
      .filter((event) => event.microSkill === microSkill)
      .map((event) => event.outcome);
    const weakestOutcome = outcomes.sort(
      (left, right) => OUTCOME_STRENGTH[left] - OUTCOME_STRENGTH[right],
    )[0];

    return {
      microSkill,
      outcome: weakestOutcome ?? ("unassessed" as const),
      strength: weakestOutcome === undefined ? -1 : OUTCOME_STRENGTH[weakestOutcome],
    };
  });
  const weakest = evidence.sort((left, right) => left.strength - right.strength)[0];

  return {
    microSkill: weakest.microSkill,
    evidenceOutcome: weakest.outcome,
    reason: "先修復這一小段能力，完成後地圖就會亮起來。",
  };
}
