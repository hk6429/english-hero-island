import type { Question } from "@/domain/questions/question-schema";

const baseQuestion: Question = {
  id: "fixture-question",
  version: 1,
  status: "draft",
  grade: 3,
  skill: "phonics",
  indicator: "能完成指定的英語微技能",
  microSkill: "cvc-decoding",
  difficulty: 1,
  modality: "text",
  questionType: "multiple_choice",
  purpose: "diagnostic",
  prompt: "Choose the correct answer.",
  options: [
    { id: "a", text: "cat" },
    { id: "b", text: "dog" },
  ],
  correctOptionId: "a",
  explanation: "這是測試用解析。",
  hints: ["先找出關鍵字母。"],
  variantGroup: "fixture-family",
  source: {
    kind: "original",
    note: "測試用原創內容",
    usageRights: "original-for-project",
  },
  author: {
    id: "test-author",
    displayName: "測試作者",
  },
  reviewers: [],
};

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    ...baseQuestion,
    ...overrides,
    source: overrides.source ?? baseQuestion.source,
    author: overrides.author ?? baseQuestion.author,
  };
}
