import type { DraftPrereviewPack } from "./build-draft-prereview-pack";

const reviewCriteriaKeys = [
  "english_correct",
  "answer_unique",
  "explanation_correct",
  "hint_safe",
  "asset_consistent",
  "rights_clear",
  "age_appropriate",
] as const;

type PackQuestion = DraftPrereviewPack["questions"][number];

export function renderDraftPrereviewPackFiles(
  pack: DraftPrereviewPack,
  generatedAt: string,
): ReadonlyMap<string, string> {
  const normalizedGeneratedAt = new Date(generatedAt).toISOString();
  const packId = `draft-${pack.sourceImport.sha256.slice(0, 16)}`;
  const blockedQuestionIds = new Set(pack.assetBlockers.map(({ questionId }) => questionId));
  const files = new Map<string, string>();

  const fileNames = [
    "README.md",
    "asset-blockers.csv",
    "draft-questions.json",
    "manifest.json",
    "production-assets.manifest.template.json",
    "questions-for-review.csv",
    "teacher-01.responses.unsigned.csv",
    "teacher-02.responses.unsigned.csv",
    "validation-report.json",
  ];
  const manifest = {
    schemaVersion: pack.schemaVersion,
    packId,
    evidenceClass: pack.evidenceClass,
    formalReviewEligible: pack.formalReviewEligible,
    generatedAt: normalizedGeneratedAt,
    questionCount: pack.questionCount,
    gradeCounts: pack.gradeCounts,
    requiredReviewerCount: 2,
    criteriaKeys: reviewCriteriaKeys,
    sourceImport: pack.sourceImport,
    questionContentHashing: pack.questionContentHashing,
    assetReadiness: pack.assetReadiness,
    evidenceLimitations: pack.evidenceLimitations,
    files: fileNames,
    cryptographicSignature: null,
  };

  files.set("README.md", renderReadme(pack, packId, normalizedGeneratedAt));
  files.set("manifest.json", prettyJson(manifest));
  files.set("draft-questions.json", prettyJson(pack.questions));
  files.set(
    "production-assets.manifest.template.json",
    prettyJson(buildProductionAssetManifestTemplate(pack)),
  );
  files.set(
    "questions-for-review.csv",
    renderQuestionsCsv(pack.questions, blockedQuestionIds),
  );
  files.set("asset-blockers.csv", renderAssetBlockersCsv(pack));
  for (const table of pack.teacherResponseTables) {
    files.set(
      table.fileName,
      renderTeacherResponseCsv(pack.questions, table.columns, table.reviewerSlot, packId),
    );
  }
  files.set(
    "validation-report.json",
    prettyJson({
      schemaVersion: 1,
      packId,
      status: "draft_only_blocked_from_formal_review",
      formalReviewEligible: false,
      questionCount: pack.questionCount,
      gradeCounts: pack.gradeCounts,
      sourceImportSha256: pack.sourceImport.sha256,
      hashedQuestionCount: pack.questions.length,
      blockedAssetCount: pack.assetReadiness.blockedQuestionCount,
      placeholderAudioCount: pack.assetReadiness.placeholderAudioCount,
      placeholderImageCount: pack.assetReadiness.placeholderImageCount,
      checks: {
        questionQuota: "passed",
        perQuestionContentHash: "passed",
        productionAssetIntegrity: "blocked",
        databaseVersionLock: "not_run",
        humanTeacherReview: "not_run",
      },
      limitations: pack.evidenceLimitations,
    }),
  );

  return files;
}

function renderReadme(pack: DraftPrereviewPack, packId: string, generatedAt: string): string {
  return `# 英語英雄島教師草稿預審包

包號：\`${packId}\`

產生時間：\`${generatedAt}\`

這不是正式複核包，也不是已通過的正式題庫。本包用來讓兩位英語教師先閱讀、標記問題與提出修正建議；任何空白欄位都不能由系統代替真人填寫。

## 本包已完成

- 200 題草稿，三至六年級各 50 題。
- 原始匯入檔 SHA-256 與每題內容 SHA-256。
- 兩份彼此分開的教師回覆表；只有題號、內容雜湊與分發代號預填，沒有教師身分、複核時間、票數或簽章。
- 七項檢核：英文正確、唯一正解、解析正確、提示安全、素材一致、權利清楚、年齡適切。

## 目前阻擋正式複核

- ${pack.assetReadiness.blockedQuestionCount} 題仍使用試作素材：${pack.assetReadiness.placeholderAudioCount} 題為 \`tts:\`，${pack.assetReadiness.placeholderImageCount} 題為 \`scene:\`。
- 尚未由專用 Supabase 產生不可變的版本號、凍結時間與伺服器受理收據。
- 尚未取得兩位英語教師各自登入後的真人判斷。
- 未宣稱 RFC 8785 或任何外部 canonicalization 標準，也沒有密碼學簽章。

## 建議使用順序

1. 教師 1 使用 \`teacher-01.responses.unsigned.csv\`，教師 2 使用 \`teacher-02.responses.unsigned.csv\`，各自獨立判斷。
2. \`questions-for-review.csv\` 只供閱讀；\`draft-questions.json\` 與內容雜湊用於核對是否被改動。
3. \`approved\` 必須七項皆為 true；\`changes_requested\` 必須至少一項為 false，並寫明原因。
4. 完成正式素材、專用 Supabase 鎖版與登入後，仍須把每一題送入伺服器的 \`submit_question_review\`；CSV 本身不能直接計票或發布。
5. production-assets.manifest.template.json 已列出 49 個待補素材槽位；空白 hash、長度、locator 與權利文件不得視為證據，必須由正式 ingest 實讀 bytes 後填入。
`;
}

function buildProductionAssetManifestTemplate(pack: DraftPrereviewPack) {
  return {
    schemaVersion: 1,
    evidenceClass: "production_question_asset_bundle",
    questionBankSha256: pack.sourceImport.sha256,
    assets: pack.assetBlockers.map((blocker) => {
      return {
        questionId: blocker.questionId,
        assetKind: blocker.assetKind,
        replacesPlaceholder: blocker.placeholderSrc,
        publicLocator: "",
        sha256: "",
        byteLength: 0,
        mimeType: blocker.assetKind === "audio" ? "audio/mpeg" : "image/webp",
        rightsEvidence: {
          sourceKind: "",
          usageRights: "",
          documentPath: "",
          sha256: "",
          byteLength: 0,
        },
      };
    }),
  };
}

function renderQuestionsCsv(
  questions: readonly PackQuestion[],
  blockedQuestionIds: ReadonlySet<string>,
): string {
  const columns = [
    "question_id",
    "question_content_sha256",
    "grade",
    "skill",
    "indicator",
    "micro_skill",
    "difficulty",
    "modality",
    "question_type",
    "purpose",
    "prompt",
    "audio_src",
    "audio_transcript",
    "image_src",
    "image_alt",
    "options_json",
    "correct_option_id",
    "explanation",
    "hints_json",
    "variant_group",
    "source_kind",
    "source_url",
    "source_note",
    "usage_rights",
    "asset_status",
  ];
  const rows = questions.map((question) => {
    const audio = readObject(question.audio);
    const image = readObject(question.image);
    const source = readObject(question.source);
    return [
      question.id,
      question.contentSha256,
      question.grade,
      readString(question.skill),
      readString(question.indicator),
      readString(question.microSkill),
      readNumber(question.difficulty),
      readString(question.modality),
      readString(question.questionType),
      readString(question.purpose),
      readString(question.prompt),
      readString(audio?.src),
      readString(audio?.transcript),
      readString(image?.src),
      readString(image?.alt),
      JSON.stringify(question.options ?? []),
      readString(question.correctOptionId),
      readString(question.explanation),
      JSON.stringify(question.hints ?? []),
      readString(question.variantGroup),
      readString(source?.kind),
      readString(source?.url),
      readString(source?.note),
      readString(source?.usageRights),
      blockedQuestionIds.has(question.id) ? "blocked_placeholder_asset" : "draft_text_ready",
    ];
  });
  return renderCsv(columns, rows);
}

function renderAssetBlockersCsv(pack: DraftPrereviewPack): string {
  return renderCsv(
    ["question_id", "asset_kind", "placeholder_src", "reason"],
    pack.assetBlockers.map((blocker) => [
      blocker.questionId,
      blocker.assetKind,
      blocker.placeholderSrc,
      blocker.reason,
    ]),
  );
}

function renderTeacherResponseCsv(
  questions: readonly PackQuestion[],
  columns: readonly string[],
  reviewerSlot: string,
  packId: string,
): string {
  return renderCsv(
    columns,
    questions.map((question, index) => {
      const preset: Readonly<Record<string, string>> = {
        worksheet_id: `${packId}-${reviewerSlot}-${String(index + 1).padStart(3, "0")}`,
        reviewer_slot: reviewerSlot,
        pack_id: packId,
        question_id: question.id,
        question_content_sha256: question.contentSha256,
      };
      return columns.map((column) => preset[column] ?? "");
    }),
  );
}

function renderCsv(columns: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [columns, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\n")
    .concat("\n");
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readObject(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | string {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}
