import type { LearningEvent } from "../learning/types";
import { deriveMastery } from "./derive-mastery";

export type ReviewPriority = "support" | "confirmation" | "maintenance";

export type ReviewSchedule = Readonly<{
  microSkill: string;
  dueDate: string;
  priority: ReviewPriority;
  reason: string;
}>;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function scheduleReview(
  microSkill: string,
  events: ReadonlyArray<LearningEvent>,
): ReviewSchedule | null {
  const latest = events
    .filter((event) => event.microSkill === microSkill)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];

  if (!latest) {
    return null;
  }

  if (deriveMastery(microSkill, events).status === "mastered") {
    return {
      microSkill,
      dueDate: addDays(latest.studyDate, 3),
      priority: "maintenance",
      reason: "能力已確認，三天後用新題型保持穩定",
    };
  }

  if (latest.outcome === "independent_correct") {
    return {
      microSkill,
      dueDate: addDays(latest.studyDate, 1),
      priority: "confirmation",
      reason: "換一個表面題，確認這項能力能獨立完成",
    };
  }

  return {
    microSkill,
    dueDate: addDays(latest.studyDate, 1),
    priority: "support",
    reason: "需要以較簡單的同能力變式題再次練習",
  };
}
