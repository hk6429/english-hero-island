import {
  getMicroSkillLabel,
  getMicroSkillRemediationFocus,
} from "./micro-skill-catalog";

export type ActivityQuestionEvidence = Readonly<{
  position: number;
  questionId: string;
  responseCount: number;
  independentCorrectCount: number;
  assistedCorrectCount: number;
  rescuedCount: number;
  pendingSupportCount: number;
}>;

export type ActivityLearningEvidence = Readonly<{
  activityId: string;
  title: string;
  status: "waiting" | "active" | "completed" | "ended";
  audience: "whole_class" | "small_group" | "individual";
  microSkill: string;
  questionCount: 3 | 5;
  participantCount: number;
  respondingParticipantCount: number;
  completedParticipantCount: number;
  questions: ReadonlyArray<ActivityQuestionEvidence>;
}>;

export type ActivityReportVerdict =
  | "data_insufficient"
  | "common_weakness"
  | "developing"
  | "secure";

export type CommonWeakness = Readonly<{
  position: number;
  responseCount: number;
  assistedCorrectCount: number;
  rescuedCount: number;
  pendingSupportCount: number;
  supportUseCount: number;
  supportUsePercent: number;
}>;

export type ActivityLearningReport = Readonly<{
  verdict: ActivityReportVerdict;
  microSkillLabel: string;
  metrics: Readonly<{
    expectedResponses: number;
    observedResponses: number;
    responseCoveragePercent: number;
    independentCorrectPercent: number;
    assistedCorrectPercent: number;
    rescuedPercent: number;
    pendingSupportPercent: number;
  }>;
  evidenceReasons: ReadonlyArray<string>;
  commonWeaknesses: ReadonlyArray<CommonWeakness>;
  recommendation: Readonly<{
    title: string;
    steps: readonly [string, string, string];
    followUp: string;
  }>;
}>;

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round(Math.min(Math.max(numerator / denominator, 0), 1) * 100);
}

function insufficientRecommendation(): ActivityLearningReport["recommendation"] {
  return {
    title: "先補足證據，再決定補救",
    steps: [
      "用同一能力安排 3 題等值短測，不沿用這次已看過的原題。",
      "至少取得 5 位學生、每題至少 3 份作答，並讓六成以上參與者完成全部題目。",
      "分開記錄未作答、獨立答對與需要支援，避免把缺席或斷線當成不會。",
    ],
    followUp: "資料達到門檻後再判讀共通弱點；目前只能視為觀察線索。",
  };
}

function recommendationFor(
  verdict: Exclude<ActivityReportVerdict, "data_insufficient">,
  microSkill: string,
): ActivityLearningReport["recommendation"] {
  const label = getMicroSkillLabel(microSkill);
  const focus = getMicroSkillRemediationFocus(microSkill);

  if (verdict === "common_weakness") {
    return {
      title: `先處理「${label}」的共通卡點`,
      steps: [
        `${focus}。`,
        "全班一起完成 1 題示範與 1 題口頭判斷，要求說出選擇線索，不公布個人排名。",
        "立即派 3 題等值變式：前 2 題有提示，第 3 題撤除提示確認能否獨立完成。",
      ],
      followUp: "隔日再用 1 題新情境確認；隔日獨立答對才列為穩定進步。",
    };
  }

  if (verdict === "developing") {
    return {
      title: "小範圍再教，避免整班重講",
      steps: [
        `${focus}。`,
        "只針對需要支援的題型做 3–5 分鐘小組示範，其餘學生進入不同情境的延伸題。",
        "用 2 題等值變式確認策略是否能撤除，不把提示後答對算成獨立精熟。",
      ],
      followUp: "隔日安排 1 題無提示確認，並與本次獨立答對率比較。",
    };
  }

  return {
    title: "維持精熟，轉移到新情境",
    steps: [
      "保留 1 題不同圖片、語序或對話情境的遷移題，避免只記住原題。",
      "請學生用一句話說出判斷線索，讓正確答案轉成可解釋的策略。",
      "將練習量轉給仍在發展的能力，不用重複刷大量同型題。",
    ],
    followUp: "隔日用 1 題無提示抽查；維持獨立答對才更新為穩定精熟。",
  };
}

export function deriveActivityLearningReport(
  evidence: ActivityLearningEvidence,
): ActivityLearningReport {
  const observedResponses = evidence.questions.reduce(
    (sum, question) => sum + question.responseCount,
    0,
  );
  const independentCorrect = evidence.questions.reduce(
    (sum, question) => sum + question.independentCorrectCount,
    0,
  );
  const assistedCorrect = evidence.questions.reduce(
    (sum, question) => sum + question.assistedCorrectCount,
    0,
  );
  const rescued = evidence.questions.reduce(
    (sum, question) => sum + question.rescuedCount,
    0,
  );
  const pendingSupport = evidence.questions.reduce(
    (sum, question) => sum + question.pendingSupportCount,
    0,
  );
  const expectedResponses = evidence.participantCount * evidence.questionCount;
  const metrics = {
    expectedResponses,
    observedResponses,
    responseCoveragePercent: percentage(observedResponses, expectedResponses),
    independentCorrectPercent: percentage(independentCorrect, observedResponses),
    assistedCorrectPercent: percentage(assistedCorrect, observedResponses),
    rescuedPercent: percentage(rescued, observedResponses),
    pendingSupportPercent: percentage(pendingSupport, observedResponses),
  };

  const evidenceReasons: string[] = [];
  if (evidence.status !== "ended" && evidence.status !== "completed") {
    evidenceReasons.push("活動尚未結束，現有數字只能當作即時觀察。");
  }
  if (evidence.participantCount < 5) {
    evidenceReasons.push(
      `目前只有 ${evidence.participantCount} 位參與者；判讀共通弱點至少 5 位參與者才足夠。`,
    );
  }
  if (
    evidence.participantCount === 0 ||
    evidence.completedParticipantCount / evidence.participantCount < 0.6
  ) {
    evidenceReasons.push(
      `完整作答者為 ${evidence.completedParticipantCount}／${evidence.participantCount}，尚未達六成。`,
    );
  }
  if (evidence.questions.length !== evidence.questionCount) {
    evidenceReasons.push("活動題目證據不完整，不能比較各題表現。");
  }
  if (
    evidence.questions.length === 0 ||
    evidence.questions.some((question) => question.responseCount < 3)
  ) {
    evidenceReasons.push("至少一題少於 3 份作答，不能把個別結果推論成共通弱點。");
  }

  if (evidenceReasons.length > 0) {
    return {
      verdict: "data_insufficient",
      microSkillLabel: getMicroSkillLabel(evidence.microSkill),
      metrics,
      evidenceReasons,
      commonWeaknesses: [],
      recommendation: insufficientRecommendation(),
    };
  }

  const commonWeaknesses = evidence.questions
    .filter(
      (question) =>
        question.responseCount >= 3 &&
        (question.assistedCorrectCount +
          question.rescuedCount +
          question.pendingSupportCount) /
          question.responseCount >=
          0.4,
    )
    .map((question) => ({
      position: question.position,
      responseCount: question.responseCount,
      assistedCorrectCount: question.assistedCorrectCount,
      rescuedCount: question.rescuedCount,
      pendingSupportCount: question.pendingSupportCount,
      supportUseCount:
        question.assistedCorrectCount +
        question.rescuedCount +
        question.pendingSupportCount,
      supportUsePercent: percentage(
        question.assistedCorrectCount +
          question.rescuedCount +
          question.pendingSupportCount,
        question.responseCount,
      ),
    }))
    .sort(
      (left, right) =>
        right.supportUsePercent - left.supportUsePercent ||
        left.position - right.position,
    )
    .slice(0, 2);

  const verdict: Exclude<ActivityReportVerdict, "data_insufficient"> =
    commonWeaknesses.length > 0
      ? "common_weakness"
      : metrics.independentCorrectPercent < 80
        ? "developing"
        : "secure";

  return {
    verdict,
    microSkillLabel: getMicroSkillLabel(evidence.microSkill),
    metrics,
    evidenceReasons: [
      `已取得 ${evidence.participantCount} 位參與者，${evidence.completedParticipantCount} 位完成全部題目。`,
    ],
    commonWeaknesses,
    recommendation: recommendationFor(verdict, evidence.microSkill),
  };
}
