import { describe, expect, it } from "vitest";
import { validateQuestionImport } from "./question-import";

const validDraftQuestion = {
  id: "g3-cvc-import-01",
  grade: 3,
  skill: "phonics",
  indicator: "能辨識基礎 CVC 字詞",
  microSkill: "cvc-short-a",
  difficulty: 1,
  modality: "text",
  questionType: "multiple_choice",
  purpose: "diagnostic",
  prompt: "Which word is cat?",
  options: [
    { id: "a", text: "cat" },
    { id: "b", text: "cap" },
    { id: "c", text: "can" },
  ],
  correctOptionId: "a",
  explanation: "cat 的結尾音是 /t/。",
  hints: ["先看最後一個字母。"],
  variantGroup: "g3-cvc-short-a-cat",
  source: {
    kind: "original",
    note: "依 CVC 微技能原創",
    usageRights: "original-for-project",
  },
} as const;

describe("question import", () => {
  it("parses content-only JSON without fake governance identities", () => {
    const result = validateQuestionImport([structuredClone(validDraftQuestion)]);

    expect(result).toEqual({
      ok: true,
      questions: [validDraftQuestion],
    });
  });

  it("rejects the whole batch and reports the invalid row without partial success", () => {
    const result = validateQuestionImport([
      structuredClone(validDraftQuestion),
      { ...structuredClone(validDraftQuestion), id: "broken-question", prompt: "" },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "INVALID_FIELD",
          index: 1,
          id: "broken-question",
          path: "prompt",
          message: expect.any(String),
        },
      ],
    });
  });

  it("reports a deterministic batch error when the JSON root is not an array", () => {
    expect(validateQuestionImport({ questions: [validDraftQuestion] })).toEqual({
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
    });
  });

  it("refuses to import a reviewed question as a draft", () => {
    expect(
      validateQuestionImport([{ ...structuredClone(validDraftQuestion), status: "reviewed" }]),
    ).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "IMPORT_STATUS_NOT_DRAFT",
          index: 0,
          id: validDraftQuestion.id,
          path: "status",
          message: "匯入只接受 draft 狀態；複核與發布必須走治理流程。",
        },
      ],
    });
  });

  it("refuses a published status even when the row also has publication validation errors", () => {
    const result = validateQuestionImport([
      { ...structuredClone(validDraftQuestion), status: "published" },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected the published import to fail.");
    expect(result.questions).toEqual([]);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "IMPORT_STATUS_NOT_DRAFT",
        index: 0,
        id: validDraftQuestion.id,
        path: "status",
      }),
    );
  });

  it("rejects multiple explicit answer keys without claiming semantic detection", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        correctOptionIds: ["a", "b"],
      },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "MULTIPLE_ANSWER_KEYS",
          index: 0,
          id: validDraftQuestion.id,
          path: "correctOptionIds",
          message: "偵測到多個明示答案鍵；單選題只允許一個正解。",
        },
      ],
    });
  });

  it("rejects duplicate explicit answer keys", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        correctOptionIds: ["a", "a"],
      },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "DUPLICATE_ANSWER_KEYS",
          index: 0,
          id: validDraftQuestion.id,
          path: "correctOptionIds",
          message: "明示答案鍵不可重複。",
        },
      ],
    });
  });

  it("reports when the answer key does not match any option", () => {
    const result = validateQuestionImport([
      { ...structuredClone(validDraftQuestion), correctOptionId: "missing" },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "ANSWER_KEY_MISSING",
          index: 0,
          id: validDraftQuestion.id,
          path: "correctOptionId",
          message: "正解必須對應一個現有選項",
        },
      ],
    });
  });

  it("rejects multiple explicit isCorrect markers in imported options", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        options: [
          { id: "a", text: "cat", isCorrect: true },
          { id: "b", text: "cap", isCorrect: true },
          { id: "c", text: "can", isCorrect: false },
        ],
      },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "MULTIPLE_ANSWER_KEYS",
          index: 0,
          id: validDraftQuestion.id,
          path: "options",
          message: "選項中有多個 isCorrect=true 明示答案；單選題只允許一個正解。",
        },
      ],
    });
  });

  it("reports every invalid row with its own index, id, and root-safe path", () => {
    const result = validateQuestionImport([
      null,
      { ...structuredClone(validDraftQuestion), id: "second-broken", prompt: "" },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected all invalid rows to be reported.");
    expect(result.questions).toEqual([]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ index: 0, id: null, path: "$", code: "INVALID_FIELD" }),
    );
    expect(result.errors[1]).toEqual(
      expect.objectContaining({
        index: 1,
        id: "second-broken",
        path: "prompt",
        code: "INVALID_FIELD",
      }),
    );
  });

  it("rejects a legacy answer key that conflicts with the canonical answer", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        correctOptionIds: ["b"],
      },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "CONFLICTING_ANSWER_KEYS",
          index: 0,
          id: validDraftQuestion.id,
          path: "correctOptionIds",
          message: "明示答案鍵與 correctOptionId 不一致。",
        },
      ],
    });
  });

  it("rejects an isCorrect marker that conflicts with the canonical answer", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        options: [
          { id: "a", text: "cat", isCorrect: false },
          { id: "b", text: "cap", isCorrect: true },
          { id: "c", text: "can", isCorrect: false },
        ],
      },
    ]);

    expect(result).toEqual({
      ok: false,
      questions: [],
      errors: [
        {
          severity: "error",
          code: "CONFLICTING_ANSWER_KEYS",
          index: 0,
          id: validDraftQuestion.id,
          path: "options",
          message: "isCorrect 明示答案與 correctOptionId 不一致。",
        },
      ],
    });
  });

  it("assigns a stable code to duplicate option text", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        options: [
          { id: "a", text: "cat" },
          { id: "b", text: "CAT" },
        ],
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected duplicate options to fail.");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_OPTION_TEXT",
        index: 0,
        id: validDraftQuestion.id,
        path: "options",
      }),
    );
  });

  it("assigns a stable code to duplicate option identifiers", () => {
    const result = validateQuestionImport([
      {
        ...structuredClone(validDraftQuestion),
        options: [
          { id: "a", text: "cat" },
          { id: "a", text: "cap" },
        ],
      },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected duplicate option identifiers to fail.");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_OPTION_ID",
        index: 0,
        id: validDraftQuestion.id,
        path: "options",
      }),
    );
  });

  it("reports a missing correctOptionId as a missing answer key", () => {
    const row: Record<string, unknown> = structuredClone(validDraftQuestion);
    delete row.correctOptionId;

    const result = validateQuestionImport([row]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected a missing answer key to fail.");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "ANSWER_KEY_MISSING",
        index: 0,
        id: validDraftQuestion.id,
        path: "correctOptionId",
      }),
    );
  });
});
