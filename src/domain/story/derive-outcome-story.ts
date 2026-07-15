import type { LearningOutcome } from "@/domain/learning/types";

export type OutcomeStory = Readonly<{
  id: "starlight-route" | "echo-route" | "campfire-route";
  title: string;
  story: string;
  tone: "gold" | "ocean" | "forest";
}>;

type OutcomeVariant = Readonly<{ title: string; story: string }>;

// 每個路線都多留幾種說法，靠 completedMissionCount 輪替，
// 玩久一點不會每次任務結束都看到一模一樣的句子；第一次一定命中原句（index 0）。
const STARLIGHT_VARIANTS: readonly OutcomeVariant[] = [
  {
    title: "星光捷徑已出現",
    story: "你一路用自己的判斷解開線索，島上的星光把下一段路標記出來了。",
  },
  {
    title: "星圖又亮了一段",
    story: "全靠自己想通每一題，island 的星圖悄悄又往前展開了一段。",
  },
];

const ECHO_VARIANTS: readonly OutcomeVariant[] = [
  {
    title: "共鳴小徑正在發亮",
    story: "你在自己思考與策略工具之間找到節奏，回聲替你保留了下一次能再試的方法。",
  },
  {
    title: "回聲又接住了一次",
    story: "自己想的和工具幫忙的都用上了，這條小徑記得你剛才用過的節奏。",
  },
];

const CAMPFIRE_VARIANTS: readonly OutcomeVariant[] = [
  {
    title: "夥伴營火已點亮",
    story: "你願意使用線索並完成這段路，營火已把需要再練習的地方安全保存下來。",
  },
  {
    title: "營火又添了一根柴",
    story: "這趟路你沒有放棄，營火把還要再練習的地方好好記下來了。",
  },
];

function pickVariant(
  variants: readonly OutcomeVariant[],
  completedMissionCount: number,
): OutcomeVariant {
  const index = Math.max(0, completedMissionCount - 1) % variants.length;
  return variants[index];
}

export function deriveOutcomeStory(
  outcomes: ReadonlyArray<LearningOutcome>,
  completedMissionCount = 0,
): OutcomeStory {
  const independentCount = outcomes.filter(
    (outcome) => outcome === "independent_correct",
  ).length;

  if (outcomes.length > 0 && independentCount === outcomes.length) {
    return {
      id: "starlight-route",
      ...pickVariant(STARLIGHT_VARIANTS, completedMissionCount),
      tone: "gold",
    };
  }

  if (independentCount > 0) {
    return {
      id: "echo-route",
      ...pickVariant(ECHO_VARIANTS, completedMissionCount),
      tone: "ocean",
    };
  }

  return {
    id: "campfire-route",
    ...pickVariant(CAMPFIRE_VARIANTS, completedMissionCount),
    tone: "forest",
  };
}
