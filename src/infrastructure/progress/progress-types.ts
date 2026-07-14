import type { BattleState } from "@/domain/battle/project-battle";
import type { LearningEvent, LearningOutcome } from "@/domain/learning/types";
import type { Grade } from "@/domain/questions/question-schema";

export type HeroId = "wave-scout" | "forest-keeper" | "star-smith";
export type HeroAccent = "ocean" | "coral" | "gold";
export type HintTool = "sound-lens" | "word-bridge" | "example-card";
export type MissionRoute = "steady-bridge" | "story-trail";
export type AdventureStage =
  | "onboarding"
  | "diagnostic"
  | "island"
  | "mission"
  | "battle"
  | "result"
  | "training";

export type StudentProfile = Readonly<{
  nickname: string;
  grade: Grade;
  heroId: HeroId;
  accent?: HeroAccent;
}>;

export type PartnerEncouragement = Readonly<{
  id: string;
  message: string;
  applicationResponse?: string;
  receivedAt: string;
}>;

export type ActiveSession = Readonly<{
  id: string;
  kind: "diagnostic" | "mission" | "review";
  microSkill: string | null;
  questionIds: string[];
  currentIndex: number;
  phase: "diagnostic" | "practice" | "boss" | "review";
  hintsUsed: number;
  selectedTool: HintTool | null;
  selectedRoute?: MissionRoute | null;
  battle: BattleState;
  outcomes: LearningOutcome[];
}>;

export type ProgressSnapshot = Readonly<{
  schemaVersion: 1;
  profile: StudentProfile | null;
  stage: AdventureStage;
  events: LearningEvent[];
  xp: number;
  abilityCards: string[];
  repairedZones: string[];
  dexEntries: string[];
  discoveries: string[];
  starlightKeys: number;
  starlightKeyDates: string[];
  partnerEncouragements: PartnerEncouragement[];
  activeSession: ActiveSession | null;
  streak: Readonly<{
    completedDates: string[];
    brightness: 0 | 1 | 2 | 3;
  }>;
}>;

export function createEmptyProgress(): ProgressSnapshot {
  return {
    schemaVersion: 1,
    profile: null,
    stage: "onboarding",
    events: [],
    xp: 0,
    abilityCards: [],
    repairedZones: [],
    dexEntries: [],
    discoveries: [],
    starlightKeys: 0,
    starlightKeyDates: [],
    partnerEncouragements: [],
    activeSession: null,
    streak: {
      completedDates: [],
      brightness: 3,
    },
  };
}
