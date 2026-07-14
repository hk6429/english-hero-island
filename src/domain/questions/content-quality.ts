import type { Question } from "./question-schema";

export type ContentQualitySeverity = "error" | "warning";

export type ContentQualityIssue = Readonly<{
  questionId: string;
  version: number;
  path: string;
  severity: ContentQualitySeverity;
  code: ContentQualityIssueCode;
  message: string;
  detail?: string;
}>;

export type ContentQualityIssueCode =
  | "ACCURACY_ANOMALY_HIGH"
  | "ACCURACY_ANOMALY_LOW"
  | "ANSWER_KEY_MISSING"
  | "AUDIO_ASSET_MISSING"
  | "AUDIO_ASSET_UNREACHABLE"
  | "AUDIO_TRANSCRIPT_MISMATCH_SUSPECTED"
  | "AUDIO_TRANSCRIPT_MISSING"
  | "DUPLICATE_EXPLICIT_ANSWER_KEYS"
  | "DUPLICATE_OPTION_ID"
  | "DUPLICATE_OPTION_TEXT"
  | "IMAGE_ALT_MISSING"
  | "IMAGE_ASSET_MISSING"
  | "IMAGE_ASSET_UNREACHABLE"
  | "MULTIPLE_EXPLICIT_ANSWER_KEYS"
  | "PERFORMANCE_DATA_INVALID"
  | "RIGHTS_NOT_PUBLISHABLE"
  | "UNRESOLVED_DISPUTE";

export type ContentPerformanceSnapshot = Readonly<{
  questionId: string;
  version: number;
  attempts: number;
  correct: number;
}>;

export type ContentDispute = Readonly<{
  questionId: string;
  version: number;
  status: "open" | "resolved";
}>;

export type ContentAssetCheck = Readonly<{
  questionId: string;
  version: number;
  kind: "audio" | "image";
  status: "available" | "unavailable" | "unchecked";
  detail?: string;
}>;

export type ContentQualityPolicy = Readonly<{
  minimumAccuracySampleSize?: number;
  lowAccuracyThreshold?: number;
  highAccuracyThreshold?: number;
}>;

export const DEFAULT_CONTENT_QUALITY_POLICY = {
  minimumAccuracySampleSize: 20,
  lowAccuracyThreshold: 0.2,
  highAccuracyThreshold: 0.95,
} as const;

export type ContentQualityAuditInput = Readonly<{
  questions: ReadonlyArray<Question>;
  performance?: ReadonlyArray<ContentPerformanceSnapshot>;
  disputes?: ReadonlyArray<ContentDispute>;
  assetChecks?: ReadonlyArray<ContentAssetCheck>;
  policy?: ContentQualityPolicy;
}>;

/**
 * Audits structural signals and monitoring data. It does not decide whether natural-language
 * options are semantically equivalent; audio text comparison is limited to inspectable `tts:` URLs.
 */
export function auditContentQuality(input: ContentQualityAuditInput): ContentQualityIssue[] {
  const issues: ContentQualityIssue[] = [];
  const minimumAccuracySampleSize =
    input.policy?.minimumAccuracySampleSize ??
    DEFAULT_CONTENT_QUALITY_POLICY.minimumAccuracySampleSize;
  const lowAccuracyThreshold =
    input.policy?.lowAccuracyThreshold ?? DEFAULT_CONTENT_QUALITY_POLICY.lowAccuracyThreshold;
  const highAccuracyThreshold =
    input.policy?.highAccuracyThreshold ?? DEFAULT_CONTENT_QUALITY_POLICY.highAccuracyThreshold;
  assertValidPolicy(
    minimumAccuracySampleSize,
    lowAccuracyThreshold,
    highAccuracyThreshold,
  );

  for (const question of input.questions) {
    const optionIds = question.options.map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "options",
        severity: "error",
        code: "DUPLICATE_OPTION_ID",
        message: "選項識別碼不可重複。",
      });
    }

    const optionTexts = question.options.map((option) => normalizeText(option.text));
    if (new Set(optionTexts).size !== optionTexts.length) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "options",
        severity: "error",
        code: "DUPLICATE_OPTION_TEXT",
        message: "正規化後的選項文字不可重複。",
      });
    }

    if (!optionIds.includes(question.correctOptionId)) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "correctOptionId",
        severity: "error",
        code: "ANSWER_KEY_MISSING",
        message: "正解必須對應一個現有選項。",
      });
    }

    const explicitAnswerKeys = (
      question as Question & { correctOptionIds?: unknown }
    ).correctOptionIds;
    const stringAnswerKeys = Array.isArray(explicitAnswerKeys)
      ? explicitAnswerKeys.filter((key): key is string => typeof key === "string")
      : [];
    if (stringAnswerKeys.length > new Set(stringAnswerKeys).size) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "correctOptionIds",
        severity: "error",
        code: "DUPLICATE_EXPLICIT_ANSWER_KEYS",
        message: "資料中的明示答案鍵不可重複。",
      });
    }
    if (
      Array.isArray(explicitAnswerKeys) &&
      new Set(stringAnswerKeys).size > 1
    ) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "correctOptionIds",
        severity: "error",
        code: "MULTIPLE_EXPLICIT_ANSWER_KEYS",
        message: "資料中有多個明示答案鍵；仍需教師檢查語意上是否另有合理答案。",
      });
    }
    const markedCorrectOptions = question.options.filter(
      (option) => (option as typeof option & { isCorrect?: unknown }).isCorrect === true,
    );
    if (markedCorrectOptions.length > 1) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "options",
        severity: "error",
        code: "MULTIPLE_EXPLICIT_ANSWER_KEYS",
        message: "選項中有多個 isCorrect=true 明示答案；仍需教師檢查語意合理性。",
      });
    }

    if (question.modality === "audio" && !question.audio?.src.trim()) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "audio",
        severity: "error",
        code: "AUDIO_ASSET_MISSING",
        message: "聽力題缺少音訊資產。",
      });
    }
    if (question.modality === "audio" && question.audio && !question.audio.transcript.trim()) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "audio.transcript",
        severity: "error",
        code: "AUDIO_TRANSCRIPT_MISSING",
        message: "聽力題缺少逐字稿。",
      });
    }
    const unavailableAudio = findUnavailableAssetCheck(input.assetChecks, question, "audio");
    if (question.modality === "audio" && unavailableAudio) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "audio.src",
        severity: "error",
        code: "AUDIO_ASSET_UNREACHABLE",
        message: "外部資產檢查確認音訊無法存取。",
        ...optionalDetail(unavailableAudio.detail),
      });
    }
    const ttsSourceText = question.audio ? readTtsSourceText(question.audio.src) : null;
    if (
      question.modality === "audio" &&
      question.audio?.transcript.trim() &&
      ttsSourceText !== null &&
      normalizeText(ttsSourceText) !== normalizeText(question.audio.transcript)
    ) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "audio.transcript",
        severity: "warning",
        code: "AUDIO_TRANSCRIPT_MISMATCH_SUSPECTED",
        message: "TTS 來源文字與逐字稿不一致；請人工聆聽確認。",
      });
    }

    if (question.modality === "image" && !question.image?.src.trim()) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "image",
        severity: "error",
        code: "IMAGE_ASSET_MISSING",
        message: "圖片題缺少圖片資產。",
      });
    }
    if (question.modality === "image" && question.image && !question.image.alt.trim()) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "image.alt",
        severity: "error",
        code: "IMAGE_ALT_MISSING",
        message: "圖片題缺少替代文字。",
      });
    }
    const unavailableImage = findUnavailableAssetCheck(input.assetChecks, question, "image");
    if (question.modality === "image" && unavailableImage) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "image.src",
        severity: "error",
        code: "IMAGE_ASSET_UNREACHABLE",
        message: "外部資產檢查確認圖片無法存取。",
        ...optionalDetail(unavailableImage.detail),
      });
    }

    if (!rightsArePublishable(question.source.kind, question.source.usageRights)) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "source.usageRights",
        severity: "error",
        code: "RIGHTS_NOT_PUBLISHABLE",
        message: "來源與授權狀態不允許發布。",
      });
    }

    const performance = input.performance?.find(
      (snapshot) =>
        snapshot.questionId === question.id && snapshot.version === question.version,
    );
    const performanceIsValid =
      performance === undefined ||
      (Number.isInteger(performance.attempts) &&
        Number.isInteger(performance.correct) &&
        performance.attempts >= 0 &&
        performance.correct >= 0 &&
        performance.correct <= performance.attempts);
    if (!performanceIsValid && performance) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "performance",
        severity: "error",
        code: "PERFORMANCE_DATA_INVALID",
        message: "作答統計必須是整數，且 0 ≤ correct ≤ attempts。",
      });
    }
    if (
      performance &&
      performanceIsValid &&
      performance.attempts >= minimumAccuracySampleSize
    ) {
      const accuracy = performance.correct / performance.attempts;
      if (accuracy < lowAccuracyThreshold) {
        issues.push({
          questionId: question.id,
          version: question.version,
          path: "performance.accuracy",
          severity: "warning",
          code: "ACCURACY_ANOMALY_LOW",
          message: `答對率 ${formatPercent(accuracy)}（${performance.correct}/${performance.attempts}）低於 ${formatPercent(lowAccuracyThreshold)} 監測門檻。`,
        });
      }
      if (accuracy > highAccuracyThreshold) {
        issues.push({
          questionId: question.id,
          version: question.version,
          path: "performance.accuracy",
          severity: "warning",
          code: "ACCURACY_ANOMALY_HIGH",
          message: `答對率 ${formatPercent(accuracy)}（${performance.correct}/${performance.attempts}）高於 ${formatPercent(highAccuracyThreshold)} 監測門檻。`,
        });
      }
    }

    const hasOpenDispute = input.disputes?.some(
      (dispute) =>
        dispute.questionId === question.id &&
        dispute.version === question.version &&
        dispute.status === "open",
    );
    if (question.status === "disputed" || hasOpenDispute) {
      issues.push({
        questionId: question.id,
        version: question.version,
        path: "governance.dispute",
        severity: "error",
        code: "UNRESOLVED_DISPUTE",
        message: "此版本仍有未處理爭議，不可發布或重新投入作答。",
      });
    }
  }

  return issues.sort(compareIssues);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function readTtsSourceText(source: string): string | null {
  if (!source.startsWith("tts:")) {
    return null;
  }
  try {
    return decodeURIComponent(source.slice(4));
  } catch {
    return null;
  }
}

function findUnavailableAssetCheck(
  checks: ReadonlyArray<ContentAssetCheck> | undefined,
  question: Question,
  kind: ContentAssetCheck["kind"],
): ContentAssetCheck | undefined {
  return checks
    ?.filter(
      (check) =>
        check.questionId === question.id &&
        check.version === question.version &&
        check.kind === kind &&
        check.status === "unavailable",
    )
    .sort((left, right) => compareText(left.detail?.trim() ?? "", right.detail?.trim() ?? ""))[0];
}

function optionalDetail(detail: string | undefined): Readonly<{ detail?: string }> {
  const normalized = detail?.trim();
  return normalized ? { detail: normalized } : {};
}

function rightsArePublishable(kind: Question["source"]["kind"], usageRights: string): boolean {
  if (kind === "original") {
    return usageRights === "original-for-project";
  }
  if (kind === "licensed") {
    return usageRights === "licensed-for-publication";
  }
  return false;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function compareIssues(left: ContentQualityIssue, right: ContentQualityIssue): number {
  const severityOrder: Record<ContentQualitySeverity, number> = { error: 0, warning: 1 };
  return (
    severityOrder[left.severity] - severityOrder[right.severity] ||
    compareText(left.questionId, right.questionId) ||
    left.version - right.version ||
    compareText(left.code, right.code) ||
    compareText(left.path, right.path)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertValidPolicy(
  minimumAccuracySampleSize: number,
  lowAccuracyThreshold: number,
  highAccuracyThreshold: number,
): void {
  if (
    !Number.isInteger(minimumAccuracySampleSize) ||
    minimumAccuracySampleSize < 1 ||
    !Number.isFinite(lowAccuracyThreshold) ||
    !Number.isFinite(highAccuracyThreshold) ||
    lowAccuracyThreshold < 0 ||
    highAccuracyThreshold > 1 ||
    lowAccuracyThreshold >= highAccuracyThreshold
  ) {
    throw new RangeError("品質監測門檻設定無效");
  }
}
