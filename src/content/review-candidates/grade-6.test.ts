import { describe, expect, it } from "vitest";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { questionSchema } from "@/domain/questions/question-schema";
import { grade6ReviewCandidates } from "./grade-6";

describe("grade 6 review candidates", () => {
  it("provides thirty-five original, varied drafts across every priority micro-skill", () => {
    expect(grade6ReviewCandidates).toHaveLength(35);
    expect(new Set(grade6ReviewCandidates.map((question) => question.id)).size).toBe(35);

    for (const question of grade6ReviewCandidates) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.grade).toBe(6);
      expect(question.status).toBe("draft");
      expect(question.source.kind).toBe("original");
      expect(question.reviewers).toEqual([]);
      expect(question.options).toHaveLength(4);
      expect(question.options.map((option) => option.id)).toEqual(["a", "b", "c", "d"]);
      expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
    }

    for (const microSkill of PRIORITY_MICRO_SKILLS[6]) {
      expect(
        grade6ReviewCandidates.filter((question) => question.microSkill === microSkill),
        microSkill,
      ).toHaveLength(7);
    }

    expect(
      grade6ReviewCandidates.reduce<Record<number, number>>((counts, question) => {
        counts[question.difficulty] = (counts[question.difficulty] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ 1: 21, 2: 12, 3: 2 });

    const prompts = grade6ReviewCandidates.map((question) => question.prompt.trim());
    const optionTexts = grade6ReviewCandidates.flatMap((question) =>
      question.options.map((option) => option.text.trim()),
    );
    const explanations = grade6ReviewCandidates.map((question) => question.explanation.trim());
    const hints = grade6ReviewCandidates.flatMap((question) =>
      question.hints.map((hint) => hint.trim()),
    );

    expect(new Set(prompts).size).toBe(prompts.length);
    expect(new Set(optionTexts).size).toBe(optionTexts.length);
    expect(new Set(explanations).size).toBe(explanations.length);
    expect(new Set(hints).size).toBe(hints.length);

    const answerPositions = grade6ReviewCandidates.map((question) =>
      question.options.findIndex((option) => option.id === question.correctOptionId),
    );
    for (const position of [0, 1, 2, 3]) {
      expect(answerPositions.filter((answerPosition) => answerPosition === position).length).toBeGreaterThanOrEqual(7);
    }
  });
});
