import type { LearningEvent, LearningOutcome } from "@/domain/learning/types";
import { updateStreak } from "@/domain/rewards/update-streak";
import type {
  ActiveSession,
  HintTool,
  MissionRoute,
  PartnerEncouragement,
  ProgressSnapshot,
  StudentProfile,
} from "@/infrastructure/progress/progress-types";

export type AdventureAction =
  | Readonly<{ type: "create_profile"; profile: StudentProfile }>
  | Readonly<{ type: "start_session"; session: ActiveSession }>
  | Readonly<{ type: "choose_tool"; tool: HintTool }>
  | Readonly<{ type: "choose_route"; route: MissionRoute }>
  | Readonly<{ type: "begin_battle" }>
  | Readonly<{
      type: "record_question";
      event: LearningEvent;
      xp: number;
      outcome: LearningOutcome;
      nextSession: ActiveSession;
    }>
  | Readonly<{ type: "complete_session" }>
  | Readonly<{ type: "record_discovery"; discoveryId: string }>
  | Readonly<{ type: "record_partner_encouragement"; card: PartnerEncouragement }>
  | Readonly<{ type: "open_training" }>
  | Readonly<{ type: "return_to_island" }>;

export function reduceAdventure(
  progress: ProgressSnapshot,
  action: AdventureAction,
): ProgressSnapshot {
  if (action.type === "create_profile") {
    return {
      ...progress,
      profile: action.profile,
      stage: "diagnostic",
    };
  }

  if (action.type === "start_session" && progress.profile) {
    return {
      ...progress,
      activeSession: action.session,
      stage:
        action.session.kind === "diagnostic"
          ? "diagnostic"
          : action.session.kind === "review"
            ? "training"
            : "mission",
    };
  }

  if (action.type === "record_question") {
    if (progress.events.some((event) => event.id === action.event.id)) {
      return progress;
    }

    return {
      ...progress,
      events: [...progress.events, action.event],
      xp: progress.xp + action.xp,
      activeSession: action.nextSession,
    };
  }

  if (action.type === "choose_tool" && progress.activeSession) {
    return {
      ...progress,
      activeSession: {
        ...progress.activeSession,
        selectedTool: action.tool,
      },
    };
  }

  if (action.type === "choose_route" && progress.activeSession?.kind === "mission") {
    return {
      ...progress,
      activeSession: {
        ...progress.activeSession,
        selectedRoute: action.route,
      },
    };
  }

  if (
    action.type === "begin_battle" &&
    progress.activeSession &&
    (progress.activeSession.kind !== "mission" ||
      (progress.activeSession.selectedTool && progress.activeSession.selectedRoute))
  ) {
    return {
      ...progress,
      stage: "battle",
    };
  }

  if (action.type === "complete_session" && progress.activeSession) {
    if (progress.activeSession.kind === "diagnostic") {
      return {
        ...progress,
        stage: "island",
        activeSession: null,
      };
    }

    const completedSkill = progress.activeSession.microSkill;
    const earnedAbilityCard = completedSkill ? `ability-${completedSkill}` : null;
    const latestSessionEvent = progress.events
      .filter((event) => event.sessionId === progress.activeSession?.id)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];
    return {
      ...progress,
      stage: "result",
      streak:
        progress.activeSession.kind === "mission" && latestSessionEvent
          ? updateStreak(progress.streak, latestSessionEvent.studyDate)
          : progress.streak,
      abilityCards:
        progress.activeSession.kind === "mission" &&
        earnedAbilityCard &&
        !progress.abilityCards.includes(earnedAbilityCard)
          ? [...progress.abilityCards, earnedAbilityCard]
          : progress.abilityCards,
      repairedZones:
        progress.activeSession.kind === "mission" &&
        completedSkill &&
        !progress.repairedZones.includes(completedSkill)
          ? [...progress.repairedZones, completedSkill]
          : progress.repairedZones,
      dexEntries:
        completedSkill && !progress.dexEntries.includes(completedSkill)
          ? [...progress.dexEntries, completedSkill]
          : progress.dexEntries,
    };
  }

  if (action.type === "record_discovery" && progress.profile) {
    const discoveries = progress.discoveries ?? [];
    if (discoveries.includes(action.discoveryId)) return progress;
    return {
      ...progress,
      discoveries: [...discoveries, action.discoveryId],
    };
  }

  if (action.type === "record_partner_encouragement" && progress.profile) {
    const cards = progress.partnerEncouragements ?? [];
    if (cards.some((card) => card.id === action.card.id)) return progress;
    return {
      ...progress,
      partnerEncouragements: [...cards, action.card],
    };
  }

  if (action.type === "open_training" && progress.profile) {
    return { ...progress, stage: "training" };
  }

  if (action.type === "return_to_island" && progress.profile) {
    return {
      ...progress,
      stage: "island",
      activeSession: null,
    };
  }

  return progress;
}
