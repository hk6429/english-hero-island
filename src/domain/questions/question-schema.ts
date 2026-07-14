import { z } from "zod";
import { canPublishQuestion } from "./publishing-gate";

const reviewerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).optional(),
  role: z.enum(["english_teacher", "content_editor", "administrator"]),
  reviewedAt: z.string().datetime(),
});

export const questionSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    status: z.enum(["draft", "in_review", "reviewed", "published", "disputed", "retired"]),
    grade: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    skill: z.enum([
      "letters",
      "phonics",
      "vocabulary",
      "classroom_english",
      "grammar",
      "comprehension",
    ]),
    indicator: z.string().min(1),
    microSkill: z.string().min(1),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    modality: z.enum(["text", "audio", "image"]),
    questionType: z.enum([
      "multiple_choice",
      "listening_choice",
      "image_choice",
      "sentence_order",
    ]),
    purpose: z.enum(["diagnostic", "practice", "boss", "rescue", "review"]),
    prompt: z.string().min(1),
    audio: z
      .object({
        src: z.string().min(1),
        transcript: z.string().min(1),
      })
      .optional(),
    image: z
      .object({
        src: z.string().min(1),
        alt: z.string().min(1),
      })
      .optional(),
    options: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(1),
        }),
      )
      .min(2)
      .max(6),
    correctOptionId: z.string().min(1),
    explanation: z.string().min(1),
    hints: z.array(z.string().min(1)).min(1),
    variantGroup: z.string().min(1),
    source: z.object({
      kind: z.enum(["original", "licensed", "research_reference"]),
      url: z.string().url().optional(),
      note: z.string().min(1),
      usageRights: z.string().min(1),
    }),
    author: z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
    }),
    reviewers: z.array(reviewerSchema),
    reviewedAt: z.string().datetime().optional(),
    publishedAt: z.string().datetime().optional(),
  })
  .superRefine((question, context) => {
    const optionTexts = question.options.map((option) => option.text.trim().toLocaleLowerCase());
    if (new Set(optionTexts).size !== optionTexts.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "選項文字不可重複",
      });
    }

    if (!question.options.some((option) => option.id === question.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "正解必須對應一個現有選項",
      });
    }

    if (question.modality === "audio" && !question.audio) {
      context.addIssue({
        code: "custom",
        path: ["audio"],
        message: "聽力題必須提供音訊與逐字稿",
      });
    }

    if (question.status === "published") {
      const decision = canPublishQuestion({
        status: question.status,
        sourceKind: question.source.kind,
        usageRights: question.source.usageRights,
        reviewers: question.reviewers,
      });

      if (!decision.allowed) {
        for (const reason of decision.reasons) {
          context.addIssue({
            code: "custom",
            path: ["status"],
            message: reason,
          });
        }
      }
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type Grade = Question["grade"];
export type Skill = Question["skill"];
export type QuestionPurpose = Question["purpose"];
