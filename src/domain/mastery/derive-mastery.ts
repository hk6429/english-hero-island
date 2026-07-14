import type { LearningEvent } from "../learning/types";

export type MasteryStatus =
  | "unassessed"
  | "practicing"
  | "pending_confirmation"
  | "mastered";

export type MasterySnapshot = Readonly<{
  microSkill: string;
  status: MasteryStatus;
  independentDates: string[];
  independentSurfaces: number;
}>;

export function deriveMastery(
  microSkill: string,
  events: ReadonlyArray<LearningEvent>,
): MasterySnapshot {
  const relevantEvents = events.filter((event) => event.microSkill === microSkill);
  const independentEvents = relevantEvents.filter(
    (event) => event.outcome === "independent_correct",
  );
  const independentDates = [...new Set(independentEvents.map((event) => event.studyDate))].sort();
  const independentSurfaces = new Set(
    independentEvents.map((event) => `${event.questionId}:${event.variantGroup}`),
  ).size;

  return {
    microSkill,
    status:
      relevantEvents.length === 0
        ? "unassessed"
        : independentDates.length >= 2 && independentSurfaces >= 2
          ? "mastered"
        : independentEvents.length > 0
          ? "pending_confirmation"
          : "practicing",
    independentDates,
    independentSurfaces,
  };
}
