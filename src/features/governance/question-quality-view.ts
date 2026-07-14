import type {
  QuestionQualityDataState,
  QuestionQualityFinding,
} from "@/components/governance/QuestionQualityPanel";
import {
  auditContentQuality,
  DEFAULT_CONTENT_QUALITY_POLICY,
} from "@/domain/questions/content-quality";
import type {
  ContentAssetCheck,
  ContentQualityIssueCode,
} from "@/domain/questions/content-quality";
import type { Question } from "@/domain/questions/question-schema";
import type {
  QuestionBankItem,
  QuestionQualitySignal,
} from "@/infrastructure/supabase/question-management-gateway";

export type QuestionQualityView = Readonly<{
  findings: ReadonlyArray<QuestionQualityFinding>;
  dataState: QuestionQualityDataState;
  assetDataState: QuestionQualityDataState;
}>;

const ISSUE_TITLES: Record<ContentQualityIssueCode, string> = {
  ACCURACY_ANOMALY_HIGH: "答對率異常偏高",
  ACCURACY_ANOMALY_LOW: "答對率異常偏低",
  ANSWER_KEY_MISSING: "正解未對應現有選項",
  AUDIO_ASSET_MISSING: "聽力題缺少音訊",
  AUDIO_ASSET_UNREACHABLE: "音訊資產無法存取",
  AUDIO_TRANSCRIPT_MISMATCH_SUSPECTED: "音訊來源與逐字稿疑似不一致",
  AUDIO_TRANSCRIPT_MISSING: "聽力題缺少逐字稿",
  DUPLICATE_EXPLICIT_ANSWER_KEYS: "明示答案鍵重複",
  DUPLICATE_OPTION_ID: "選項識別碼重複",
  DUPLICATE_OPTION_TEXT: "選項文字重複",
  IMAGE_ALT_MISSING: "圖片題缺少替代文字",
  IMAGE_ASSET_MISSING: "圖片題缺少圖片",
  IMAGE_ASSET_UNREACHABLE: "圖片資產無法存取",
  MULTIPLE_EXPLICIT_ANSWER_KEYS: "資料中有多個明示答案鍵",
  PERFORMANCE_DATA_INVALID: "作答統計資料無效",
  RIGHTS_NOT_PUBLISHABLE: "來源授權不允許發布",
  UNRESOLVED_DISPUTE: "題目爭議尚未結案",
};

export function buildQuestionQualityView(
  questions: ReadonlyArray<QuestionBankItem>,
  signals: ReadonlyArray<QuestionQualitySignal>,
  assetChecks: ReadonlyArray<ContentAssetCheck> = [],
): QuestionQualityView {
  const insufficientQuestionCount = questions.filter((question) => {
    const signal = signals.find(
      (candidate) =>
        candidate.questionId === question.id &&
        candidate.version === question.version,
    );
    return (
      signal === undefined ||
      signal.responseCount <
        DEFAULT_CONTENT_QUALITY_POLICY.minimumAccuracySampleSize
    );
  }).length;
  const issues = auditContentQuality({
    questions: questions.map(toAuditableQuestion),
    performance: signals.map((signal) => ({
      questionId: signal.questionId,
      version: signal.version,
      attempts: signal.responseCount,
      correct:
        signal.independentCorrectCount + signal.assistedCorrectCount,
    })),
    disputes: signals
      .filter((signal) => signal.isDisputed)
      .map((signal) => ({
        questionId: signal.questionId,
        version: signal.version,
        status: "open" as const,
      })),
    assetChecks,
  });
  const governedAssets = questions.flatMap((question) => [
    ...(question.audio
      ? [{ questionId: question.id, version: question.version, kind: "audio" as const }]
      : []),
    ...(question.image
      ? [{ questionId: question.id, version: question.version, kind: "image" as const }]
      : []),
  ]);
  const uncheckedAssetCount = governedAssets.filter(
    (asset) =>
      !assetChecks.some(
        (check) =>
          check.questionId === asset.questionId &&
          check.version === asset.version &&
          check.kind === asset.kind &&
          check.status !== "unchecked",
      ),
  ).length;

  return {
    findings: issues.map((issue) => ({
      id: `${issue.questionId}-v${issue.version}-${issue.code}-${issue.path}`,
      questionId: issue.questionId,
      questionVersion: issue.version,
      severity: issue.severity === "error" ? "blocking" : "warning",
      title: ISSUE_TITLES[issue.code],
      description:
        issue.severity === "error"
          ? "請由內容編輯或英語教師確認並修正後，再進入發布流程。"
          : "請由內容編輯或英語教師確認此品質訊號。",
      evidence: `題號 ${issue.questionId}／版本 ${issue.version}：${issue.message}`,
    })),
    dataState:
      questions.length === 0
        ? {
            state: "insufficient",
            message: "目前沒有可稽核的題目版本；不能判定沒有品質問題。",
          }
        : insufficientQuestionCount === 0
        ? {
            state: "sufficient",
            message: `${questions.length} 個題目版本皆已達每題至少 ${DEFAULT_CONTENT_QUALITY_POLICY.minimumAccuracySampleSize} 份作答的監測門檻；仍須依品質訊號進行人工判讀。`,
          }
        : {
            state: "insufficient",
            message: `${insufficientQuestionCount} 個題目版本尚未達每題至少 ${DEFAULT_CONTENT_QUALITY_POLICY.minimumAccuracySampleSize} 份作答的監測門檻；現階段不能判定沒有品質問題。`,
          },
    assetDataState:
      governedAssets.length === 0
        ? {
            state: "sufficient",
            message: "目前題目版本沒有音訊或圖片資產需要自動檢查。",
          }
        : uncheckedAssetCount === 0
        ? {
            state: "sufficient",
            message: `${governedAssets.length} 個音訊或圖片資產已有自動檢查結果；無法存取的項目仍會阻擋發布。`,
          }
        : {
            state: "insufficient",
            message: `${uncheckedAssetCount} 個音訊或圖片資產尚未由自動檢查確認；發布前必須由真人開啟並核對。`,
          },
  };
}

function toAuditableQuestion(item: QuestionBankItem): Question {
  return {
    id: item.id,
    version: item.version,
    ...(item.supersedesVersion === null
      ? {}
      : { supersedesVersion: item.supersedesVersion }),
    ...(item.changeSummary === null ? {} : { changeSummary: item.changeSummary }),
    status: item.status,
    grade: item.grade,
    skill: item.skill,
    indicator: item.indicator,
    microSkill: item.microSkill,
    difficulty: item.difficulty,
    modality: item.modality,
    questionType: item.questionType,
    purpose: item.purpose,
    prompt: item.prompt,
    ...(item.audio === null ? {} : { audio: item.audio }),
    ...(item.image === null ? {} : { image: item.image }),
    options: [...item.options],
    correctOptionId: item.correctOptionId,
    explanation: item.explanation,
    hints: [...item.hints],
    variantGroup: item.variantGroup,
    source: item.source,
    author: item.author,
    reviewers: [],
    ...(item.reviewedAt === null ? {} : { reviewedAt: item.reviewedAt }),
    ...(item.publishedAt === null ? {} : { publishedAt: item.publishedAt }),
  };
}
