import { describe, expect, it } from "vitest";

import { questionSchema } from "@/domain/questions/question-schema";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";

import { grade5ReviewCandidates } from "./grade-5";

describe("grade 5 review candidates", () => {
  it("provides seven schema-valid original drafts for every priority micro-skill", () => {
    expect(grade5ReviewCandidates).toHaveLength(35);
    expect(new Set(grade5ReviewCandidates.map((question) => question.id)).size).toBe(35);

    for (const question of grade5ReviewCandidates) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.grade).toBe(5);
      expect(question.status).toBe("draft");
      expect(question.source.kind).toBe("original");
      expect(question.source.usageRights).toBe("original-for-project");
      expect(question.reviewers).toEqual([]);
      expect(question.options.map((option) => option.id)).toEqual(["a", "b", "c", "d"]);
    }

    expect(
      [...new Set(grade5ReviewCandidates.map((question) => question.microSkill))].sort(),
    ).toEqual([...PRIORITY_MICRO_SKILLS[5]].sort());

    for (const microSkill of PRIORITY_MICRO_SKILLS[5]) {
      expect(
        grade5ReviewCandidates.filter((question) => question.microSkill === microSkill),
        microSkill,
      ).toHaveLength(7);
    }
  });

  it("keeps the draft set varied, concrete, and balanced for learner practice", () => {
    const normalizedPrompts = grade5ReviewCandidates.map((question) =>
      question.prompt.trim().toLocaleLowerCase(),
    );
    const normalizedOptionSets = grade5ReviewCandidates.map((question) =>
      question.options
        .map((option) => option.text.trim().toLocaleLowerCase())
        .sort()
        .join("|"),
    );
    const normalizedOptions = grade5ReviewCandidates.flatMap((question) =>
      question.options.map((option) => option.text.trim().toLocaleLowerCase()),
    );
    const normalizedExplanations = grade5ReviewCandidates.map((question) =>
      question.explanation.trim().toLocaleLowerCase(),
    );
    const normalizedHintSets = grade5ReviewCandidates.map((question) =>
      question.hints.map((hint) => hint.trim().toLocaleLowerCase()).join("|"),
    );

    expect(new Set(normalizedPrompts).size).toBe(35);
    expect(new Set(normalizedOptionSets).size).toBe(35);
    const duplicateOptions = normalizedOptions.filter(
      (option, index) => normalizedOptions.indexOf(option) !== index,
    );
    expect(new Set(normalizedOptions).size, duplicateOptions.join(", ")).toBe(
      normalizedOptions.length,
    );
    expect(new Set(normalizedExplanations).size).toBe(35);
    expect(new Set(normalizedHintSets).size).toBe(35);

    for (const question of grade5ReviewCandidates) {
      expect(question.prompt.length, `${question.id} prompt`).toBeGreaterThanOrEqual(20);
      expect(question.explanation.length, `${question.id} explanation`).toBeGreaterThanOrEqual(18);
      expect(question.hints[0]?.length, `${question.id} hint`).toBeGreaterThanOrEqual(12);
      expect(new Set(question.options.map((option) => option.text.toLocaleLowerCase())).size).toBe(
        4,
      );
    }

    const difficultyCounts = grade5ReviewCandidates.reduce<Record<number, number>>(
      (counts, question) => {
        counts[question.difficulty] = (counts[question.difficulty] ?? 0) + 1;
        return counts;
      },
      {},
    );
    expect(difficultyCounts).toEqual({ 1: 21, 2: 12, 3: 2 });

    const answerPositionCounts = grade5ReviewCandidates.reduce<Record<string, number>>(
      (counts, question) => {
        counts[question.correctOptionId] = (counts[question.correctOptionId] ?? 0) + 1;
        return counts;
      },
      {},
    );
    expect(Object.keys(answerPositionCounts).sort()).toEqual(["a", "b", "c", "d"]);
    const answerCounts = Object.values(answerPositionCounts);
    expect(
      Math.max(...answerCounts) - Math.min(...answerCounts),
      JSON.stringify(answerPositionCounts),
    ).toBeLessThanOrEqual(1);
  });
});
