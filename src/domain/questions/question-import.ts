import { questionSchema, type Question } from "./question-schema";

export type ImportedQuestionDraft = Pick<
  Question,
  | "id"
  | "grade"
  | "skill"
  | "indicator"
  | "microSkill"
  | "difficulty"
  | "modality"
  | "questionType"
  | "purpose"
  | "prompt"
  | "audio"
  | "image"
  | "options"
  | "correctOptionId"
  | "explanation"
  | "hints"
  | "variantGroup"
  | "source"
>;

export type QuestionImportResult =
  | Readonly<{ ok: true; questions: ImportedQuestionDraft[] }>
  | Readonly<{ ok: false; questions: []; errors: QuestionImportError[] }>;

export type QuestionImportError = Readonly<{
  severity: "error";
  code:
    | "ANSWER_KEY_MISSING"
    | "CONFLICTING_ANSWER_KEYS"
    | "DUPLICATE_ANSWER_KEYS"
    | "DUPLICATE_OPTION_ID"
    | "DUPLICATE_OPTION_TEXT"
    | "IMPORT_STATUS_NOT_DRAFT"
    | "INVALID_BATCH"
    | "INVALID_FIELD"
    | "MULTIPLE_ANSWER_KEYS";
  index: number;
  id: string | null;
  path: string;
  message: string;
}>;

/** Parses an imported JSON batch atomically; any row error rejects the entire batch. */
export function validateQuestionImport(input: unknown): QuestionImportResult {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "INVALID_BATCH",
          index: -1,
          id: null,
          path: "$",
          message: "匯入資料必須是題目陣列。",
        },
      ],
    };
  }

  const values = input;
  const questions: ImportedQuestionDraft[] = [];
  const errors: QuestionImportError[] = [];

  for (const [index, value] of values.entries()) {
    const rowErrorStart = errors.length;
    const id = readQuestionId(value);
    const status = readStringField(value, "status");
    const hasForbiddenStatus =
      status === "in_review" ||
      status === "reviewed" ||
      status === "published" ||
      status === "disputed" ||
      status === "retired";
    if (hasForbiddenStatus) {
      errors.push({
        severity: "error",
        code: "IMPORT_STATUS_NOT_DRAFT",
        index,
        id,
        path: "status",
        message: "匯入只接受 draft 狀態；複核與發布必須走治理流程。",
      });
    }

    const explicitAnswerKeys = readUnknownField(value, "correctOptionIds");
    const stringAnswerKeys = Array.isArray(explicitAnswerKeys)
      ? explicitAnswerKeys.filter((answer): answer is string => typeof answer === "string")
      : [];
    const canonicalAnswerKey = readStringField(value, "correctOptionId");
    if (
      stringAnswerKeys.length === 1 &&
      canonicalAnswerKey !== null &&
      stringAnswerKeys[0] !== canonicalAnswerKey
    ) {
      errors.push({
        severity: "error",
        code: "CONFLICTING_ANSWER_KEYS",
        index,
        id,
        path: "correctOptionIds",
        message: "明示答案鍵與 correctOptionId 不一致。",
      });
    }
    if (stringAnswerKeys.length > new Set(stringAnswerKeys).size) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_ANSWER_KEYS",
        index,
        id,
        path: "correctOptionIds",
        message: "明示答案鍵不可重複。",
      });
    }
    if (
      Array.isArray(explicitAnswerKeys) &&
      new Set(stringAnswerKeys).size > 1
    ) {
      errors.push({
        severity: "error",
        code: "MULTIPLE_ANSWER_KEYS",
        index,
        id,
        path: "correctOptionIds",
        message: "偵測到多個明示答案鍵；單選題只允許一個正解。",
      });
    }

    const rawOptions = readUnknownField(value, "options");
    const markedCorrectOptionIds = Array.isArray(rawOptions)
      ? rawOptions.flatMap((option) => {
          if (
            typeof option !== "object" ||
            option === null ||
            !("isCorrect" in option) ||
            option.isCorrect !== true ||
            !("id" in option) ||
            typeof option.id !== "string"
          ) {
            return [];
          }
          return [option.id];
        })
      : [];
    if (markedCorrectOptionIds.length === 1 && markedCorrectOptionIds[0] !== canonicalAnswerKey) {
      errors.push({
        severity: "error",
        code: "CONFLICTING_ANSWER_KEYS",
        index,
        id,
        path: "options",
        message: "isCorrect 明示答案與 correctOptionId 不一致。",
      });
    }
    if (markedCorrectOptionIds.length > 1) {
      errors.push({
        severity: "error",
        code: "MULTIPLE_ANSWER_KEYS",
        index,
        id,
        path: "options",
        message: "選項中有多個 isCorrect=true 明示答案；單選題只允許一個正解。",
      });
    }

    const result = questionSchema.safeParse(
      typeof value === "object" && value !== null
        ? {
            version: 1,
            status: "draft",
            author: {
              id: "server-assigned-on-import",
              displayName: "由伺服器指派",
            },
            reviewers: [],
            ...value,
          }
        : value,
    );
    if (result.success) {
      if (errors.length > rowErrorStart) {
        continue;
      }
      questions.push(toImportedDraft(result.data));
      continue;
    }

    errors.push(
      ...result.error.issues.map((issue) => {
        const path = formatIssuePath(issue.path);
        return {
          severity: "error" as const,
          code: importIssueCode(path, issue.message),
          index,
          id,
          path,
          message: issue.message,
        };
      }),
    );
  }

  return errors.length > 0 ? { ok: false, questions: [], errors } : { ok: true, questions };
}

function toImportedDraft(question: Question): ImportedQuestionDraft {
  return {
    id: question.id,
    grade: question.grade,
    skill: question.skill,
    indicator: question.indicator,
    microSkill: question.microSkill,
    difficulty: question.difficulty,
    modality: question.modality,
    questionType: question.questionType,
    purpose: question.purpose,
    prompt: question.prompt,
    ...(question.audio ? { audio: question.audio } : {}),
    ...(question.image ? { image: question.image } : {}),
    options: question.options,
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    hints: question.hints,
    variantGroup: question.variantGroup,
    source: question.source,
  };
}

function formatIssuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.length === 0 ? "$" : path.map(String).join(".");
}

function importIssueCode(
  path: string,
  message: string,
): QuestionImportError["code"] {
  if (path === "correctOptionId") {
    return "ANSWER_KEY_MISSING";
  }
  if (path === "options" && message === "選項文字不可重複") {
    return "DUPLICATE_OPTION_TEXT";
  }
  if (path === "options" && message === "選項識別碼不可重複") {
    return "DUPLICATE_OPTION_ID";
  }
  return "INVALID_FIELD";
}

function readUnknownField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return value[key as keyof typeof value];
}

function readStringField(value: unknown, key: string): string | null {
  const field = readUnknownField(value, key);
  return typeof field === "string" ? field : null;
}

function readQuestionId(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("id" in value)) {
    return null;
  }
  return typeof value.id === "string" ? value.id : null;
}
