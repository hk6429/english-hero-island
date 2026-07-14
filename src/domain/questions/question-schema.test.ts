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
});

export { validDraftQuestion };
