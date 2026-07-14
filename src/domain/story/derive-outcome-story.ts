import type { LearningOutcome } from "@/domain/learning/types";

export type OutcomeStory = Readonly<{
  id: "starlight-route" | "echo-route" | "campfire-route";
  title: string;
  story: string;
  tone: "gold" | "ocean" | "forest";
}>;

export function deriveOutcomeStory(outcomes: ReadonlyArray<LearningOutcome>): OutcomeStory {
  const independentCount = outcomes.filter(
    (outcome) => outcome === "independent_correct",
  ).length;

  if (outcomes.length > 0 && independentCount === outcomes.length) {
    return {
      id: "starlight-route",
      title: "星光捷徑已出現",
      story: "你一路用自己的判斷解開線索，島上的星光把下一段路標記出來了。",
      tone: "gold",
    };
  }

  if (independentCount > 0) {
    return {
      id: "echo-route",
      title: "共鳴小徑正在發亮",
      story: "你在自己思考與策略工具之間找到節奏，回聲替你保留了下一次能再試的方法。",
      tone: "ocean",
    };
  }

  return {
    id: "campfire-route",
    title: "夥伴營火已點亮",
    story: "你願意使用線索並完成這段路，營火已把需要再練習的地方安全保存下來。",
    tone: "forest",
  };
}
