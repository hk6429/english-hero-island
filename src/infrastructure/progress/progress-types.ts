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
  // 這個回合累積的 XP，只用來讓結果頁跑「數字往上跳」的動畫，不影響 progress.xp 這個總數本身。
  sessionXp?: number;
  // 本年級這項能力的練功／Boss 題不足時，改借用較低年級已驗證足額的重點能力；
  // 有值代表這是「往前複習」而非原年級任務，UI 要誠實標示，不可悄悄替換。
  reviewFallbackGrade?: Grade | null;
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
  // 已完成的任務（mission）總數，用來輪替每年級的聚焦能力；不分年級，只是單調遞增的計數器。
  completedMissionCount: number;
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
    completedMissionCount: 0,
  };
}
