import { describe, expect, it } from "vitest";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { questionSchema } from "@/domain/questions/question-schema";
import { grade4ReviewCandidates } from "./grade-4";

const normalize = (value: string) => value.trim().toLocaleLowerCase();

describe("grade 4 review candidates", () => {
  it("exports 35 unique, schema-valid drafts awaiting human review", () => {
    expect(grade4ReviewCandidates).toHaveLength(35);
    expect(new Set(grade4ReviewCandidates.map((question) => question.id)).size).toBe(35);

    for (const question of grade4ReviewCandidates) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.grade).toBe(4);
      expect(question.status).toBe("draft");
      expect(question.source.kind).toBe("original");
      expect(question.reviewers).toEqual([]);
      expect(question.options.map((option) => option.id)).toEqual(["a", "b", "c", "d"]);
      expect(new Set(question.options.map((option) => normalize(option.text))).size).toBe(4);
    }
  });

  it("covers every grade 4 priority micro-skill with seven questions", () => {
    expect(new Set(grade4ReviewCandidates.map((question) => question.microSkill))).toEqual(
      new Set(PRIORITY_MICRO_SKILLS[4]),
    );

    for (const microSkill of PRIORITY_MICRO_SKILLS[4]) {
      expect(
        grade4ReviewCandidates.filter((question) => question.microSkill === microSkill),
        microSkill,
      ).toHaveLength(7);
    }
  });

  it("uses the agreed primary-school difficulty mix", () => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    for (const question of grade4ReviewCandidates) {
      counts[question.difficulty] += 1;
    }

    expect(counts).toEqual({ 1: 21, 2: 12, 3: 2 });
  });

  it("keeps prompts, explanations, and complete option sets distinct", () => {
    const prompts = grade4ReviewCandidates.map((question) => normalize(question.prompt));
    const explanations = grade4ReviewCandidates.map((question) =>
      normalize(question.explanation),
    );
    const optionSets = grade4ReviewCandidates.map((question) =>
      question.options.map((option) => normalize(option.text)).join(" | "),
    );

    expect(new Set(prompts).size).toBe(35);
    expect(new Set(explanations).size).toBe(35);
    const repeatedOptionSets = optionSets.filter(
      (optionSet, index) => optionSets.indexOf(optionSet) !== index,
    );

    expect(new Set(optionSets).size, repeatedOptionSets.join("\n")).toBe(35);
  });

  it("distributes correct answers evenly across all four positions", () => {
    const answerCounts = new Map<string, number>();
    for (const question of grade4ReviewCandidates) {
      answerCounts.set(question.correctOptionId, (answerCounts.get(question.correctOptionId) ?? 0) + 1);
    }

    expect([...answerCounts.keys()].sort()).toEqual(["a", "b", "c", "d"]);
    expect([...answerCounts.values()].sort((left, right) => right - left)).toEqual([9, 9, 9, 8]);
  });
});
