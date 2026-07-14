import { describe, expect, it } from "vitest";
import { questionSchema } from "@/domain/questions/question-schema";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { grade3ReviewCandidates } from "./grade-3";

describe("grade 3 review candidates", () => {
  it("provides thirty-five balanced, original, schema-valid drafts", () => {
    expect(grade3ReviewCandidates).toHaveLength(35);
    expect(new Set(grade3ReviewCandidates.map((question) => question.id)).size).toBe(35);
    expect(new Set(grade3ReviewCandidates.map((question) => question.prompt)).size).toBe(35);

    for (const question of grade3ReviewCandidates) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.grade).toBe(3);
      expect(question.status).toBe("draft");
      expect(question.source.kind).toBe("original");
      expect(question.reviewers).toEqual([]);
    }

    for (const microSkill of PRIORITY_MICRO_SKILLS[3]) {
      expect(
        grade3ReviewCandidates.filter((question) => question.microSkill === microSkill),
        microSkill,
      ).toHaveLength(7);
    }

    expect(grade3ReviewCandidates.filter((question) => question.difficulty === 1)).toHaveLength(21);
    expect(grade3ReviewCandidates.filter((question) => question.difficulty === 2)).toHaveLength(12);
    expect(grade3ReviewCandidates.filter((question) => question.difficulty === 3)).toHaveLength(2);
  });
});
