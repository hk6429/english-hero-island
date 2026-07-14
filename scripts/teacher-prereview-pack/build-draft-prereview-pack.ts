import { createHash } from "node:crypto";

type Grade = 3 | 4 | 5 | 6;

type QuestionDraft = Readonly<{
  id: string;
  grade: Grade;
  [key: string]: unknown;
}>;

type AssetBlocker = Readonly<{
  questionId: string;
  assetKind: "audio" | "image";
  placeholderSrc: string;
  reason: "placeholder_asset_requires_production_and_integrity_evidence";
}>;

const teacherResponseColumns = [
  "worksheet_id",
  "reviewer_slot",
  "pack_id",
  "question_id",
  "question_content_sha256",
  "english_correct",
  "answer_unique",
  "explanation_correct",
  "hint_safe",
  "asset_consistent",
  "rights_clear",
  "age_appropriate",
  "verdict",
  "review_note",
  "failed_criteria_notes",
  "suggested_revision",
] as const;

type TeacherResponseTable = Readonly<{
  fileName:
    | "teacher-01.responses.unsigned.csv"
    | "teacher-02.responses.unsigned.csv";
  reviewerSlot: "teacher-01" | "teacher-02";
  columns: typeof teacherResponseColumns;
  rows: readonly Readonly<Record<string, string>>[];
}>;

export type DraftPrereviewPack = Readonly<{
  schemaVersion: 1;
  evidenceClass: "draft_prereview_pack";
  formalReviewEligible: false;
  evidenceLimitations: Readonly<{
    databaseVersionLock: "not_included";
    externalCanonicalizationStandard: "not_claimed";
    humanTeacherDecisions: "not_included";
    productionAssetIntegrity: "placeholder_assets_blocked";
  }>;
  questionCount: 200;
  gradeCounts: Readonly<Record<Grade, 50>>;
  sourceImport: Readonly<{
    byteLength: number;
    sha256: string;
  }>;
  questionContentHashing: Readonly<{
    algorithm: "sha256";
    serialization: "stable-json-key-sort-v1";
  }>;
  assetReadiness: Readonly<{
    readyQuestionCount: number;
    blockedQuestionCount: number;
    placeholderAudioCount: number;
    placeholderImageCount: number;
  }>;
  assetBlockers: readonly AssetBlocker[];
  teacherResponseTables: readonly TeacherResponseTable[];
  questions: readonly (QuestionDraft & Readonly<{ contentSha256: string }>)[];
}>;

export function buildDraftPrereviewPack(sourceBytes: Uint8Array): DraftPrereviewPack {
  const questions = readQuestionDrafts(parseSource(sourceBytes));
  const gradeCounts = countGrades(questions);
  const assetBlockers = findAssetBlockers(questions);
  const blockedQuestionIds = new Set(assetBlockers.map(({ questionId }) => questionId));

  if (
    questions.length !== 200 ||
    gradeCounts[3] !== 50 ||
    gradeCounts[4] !== 50 ||
    gradeCounts[5] !== 50 ||
    gradeCounts[6] !== 50
  ) {
    throw new Error(
      `草稿預審包必須包含 200 題且各年級 50 題；實際 ${questions.length} 題，` +
        `三年級 ${gradeCounts[3]} 題、四年級 ${gradeCounts[4]} 題、` +
        `五年級 ${gradeCounts[5]} 題、六年級 ${gradeCounts[6]} 題。`,
    );
  }

  return {
    schemaVersion: 1,
    evidenceClass: "draft_prereview_pack",
    formalReviewEligible: false,
    evidenceLimitations: {
      databaseVersionLock: "not_included",
      externalCanonicalizationStandard: "not_claimed",
      humanTeacherDecisions: "not_included",
      productionAssetIntegrity: "placeholder_assets_blocked",
    },
    questionCount: 200,
    gradeCounts: { 3: 50, 4: 50, 5: 50, 6: 50 },
    sourceImport: {
      byteLength: sourceBytes.byteLength,
      sha256: sha256(sourceBytes),
    },
    questionContentHashing: {
      algorithm: "sha256",
      serialization: "stable-json-key-sort-v1",
    },
    assetReadiness: {
      readyQuestionCount: questions.length - blockedQuestionIds.size,
      blockedQuestionCount: blockedQuestionIds.size,
      placeholderAudioCount: assetBlockers.filter(({ assetKind }) => assetKind === "audio").length,
      placeholderImageCount: assetBlockers.filter(({ assetKind }) => assetKind === "image").length,
    },
    assetBlockers,
    teacherResponseTables: [
      {
        fileName: "teacher-01.responses.unsigned.csv",
        reviewerSlot: "teacher-01",
        columns: teacherResponseColumns,
        rows: [],
      },
      {
        fileName: "teacher-02.responses.unsigned.csv",
        reviewerSlot: "teacher-02",
        columns: teacherResponseColumns,
        rows: [],
      },
    ],
    questions: questions.map((question) => ({
      ...question,
      contentSha256: sha256(stableSerialize(question)),
    })),
  };
}

function findAssetBlockers(questions: readonly QuestionDraft[]): AssetBlocker[] {
  return questions.flatMap((question) => {
    const blockers: AssetBlocker[] = [];
    const audioSrc = readNestedString(question, "audio", "src");
    const imageSrc = readNestedString(question, "image", "src");

    if (audioSrc?.startsWith("tts:")) {
      blockers.push({
        questionId: question.id,
        assetKind: "audio",
        placeholderSrc: audioSrc,
        reason: "placeholder_asset_requires_production_and_integrity_evidence",
      });
    }
    if (imageSrc?.startsWith("scene:")) {
      blockers.push({
        questionId: question.id,
        assetKind: "image",
        placeholderSrc: imageSrc,
        reason: "placeholder_asset_requires_production_and_integrity_evidence",
      });
    }

    return blockers;
  });
}

function readNestedString(
  value: Readonly<Record<string, unknown>>,
  objectKey: string,
  fieldKey: string,
): string | null {
  const objectValue = value[objectKey];
  if (typeof objectValue !== "object" || objectValue === null || !(fieldKey in objectValue)) {
    return null;
  }
  const field = objectValue[fieldKey as keyof typeof objectValue];
  return typeof field === "string" ? field : null;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, field]) => `${JSON.stringify(key)}:${stableSerialize(field)}`)
      .join(",")}}`;
  }
  throw new Error("草稿預審包只能雜湊有效的 JSON 內容。");
}

function parseSource(sourceBytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(sourceBytes));
  } catch {
    throw new Error("草稿預審包的題庫來源必須是有效的 UTF-8 JSON。");
  }
}

function readQuestionDrafts(input: unknown): readonly QuestionDraft[] {
  if (!Array.isArray(input)) {
    throw new Error("草稿預審包的題庫來源必須是陣列。");
  }

  return input.map((question) => {
    if (
      typeof question !== "object" ||
      question === null ||
      !("id" in question) ||
      typeof question.id !== "string" ||
      !("grade" in question) ||
      !isGrade(question.grade)
    ) {
      throw new Error("草稿預審包含有無法辨識的題目。");
    }
    return question as QuestionDraft;
  });
}

function countGrades(questions: readonly QuestionDraft[]): Record<Grade, number> {
  const counts: Record<Grade, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const question of questions) {
    counts[question.grade] += 1;
  }
  return counts;
}

function isGrade(value: unknown): value is Grade {
  return value === 3 || value === 4 || value === 5 || value === 6;
}
