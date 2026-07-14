import { describe, expect, it } from "vitest";
import { questionSchema } from "./question-schema";

const validDraftQuestion = {
  id: "g3-cvc-diagnostic-01",
  version: 1,
  status: "draft",
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
  author: { id: "hero-island-team", displayName: "英語英雄島團隊" },
  reviewers: [],
} as const;

describe("question schema", () => {
  it("rejects duplicate option text", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      options: [
        { id: "a", text: "cat" },
        { id: "b", text: "cat" },
        { id: "c", text: "can" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an answer that is not one of the options", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      correctOptionId: "missing-option",
    });

    expect(result.success).toBe(false);
  });

  it("requires an audio asset and transcript for an audio question", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      modality: "audio",
      questionType: "listening_choice",
    });

    expect(result.success).toBe(false);
  });

  it("does not accept published status when the publishing gate fails", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      status: "published",
      publishedAt: "2026-07-14T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("requires an image and safe alt text for an image question", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      modality: "image",
      questionType: "image_choice",
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate option identifiers", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      options: [
        { id: "a", text: "cat" },
        { id: "a", text: "cap" },
        { id: "c", text: "can" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("requires review and publication timestamps for a published question", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      status: "published",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
        {
          id: "teacher-b",
          role: "english_teacher",
          reviewedAt: "2026-07-14T09:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a fully reviewed original question for publication", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      status: "published",
      reviewedAt: "2026-07-14T09:00:00.000Z",
      publishedAt: "2026-07-14T10:00:00.000Z",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
        {
          id: "teacher-b",
          role: "english_teacher",
          reviewedAt: "2026-07-14T09:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects predecessor metadata on the first version", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      supersedesVersion: 1,
      changeSummary: "第一版不應宣稱取代其他版本。",
    });

    expect(result.success).toBe(false);
  });

  it("requires a revision to link to the immediately preceding version", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      version: 3,
      supersedesVersion: 1,
      changeSummary: "修正第三版的解析內容。",
    });

    expect(result.success).toBe(false);
  });

  it("requires every revision to explain what changed", () => {
    const result = questionSchema.safeParse({
      ...validDraftQuestion,
      version: 2,
      supersedesVersion: 1,
    });

    expect(result.success).toBe(false);
  });
});

export { validDraftQuestion };
