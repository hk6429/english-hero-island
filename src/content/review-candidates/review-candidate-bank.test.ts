import { describe, expect, it } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { toQuestionImportPayload, validateQuestionImport } from "@/domain/questions/question-import";
import { questionSchema, type Grade } from "@/domain/questions/question-schema";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { newReviewCandidates, reviewCandidateQuestionBank } from "./index";

const grades: Grade[] = [3, 4, 5, 6];

describe("review candidate question bank", () => {
  it("combines the fixed sixty-question pilot with 143 new drafts", () => {
    expect(pilotQuestionBank).toHaveLength(60);
    expect(newReviewCandidates).toHaveLength(143);
    expect(reviewCandidateQuestionBank).toHaveLength(203);
    expect(new Set(reviewCandidateQuestionBank.map((question) => question.id)).size).toBe(203);

    for (const question of reviewCandidateQuestionBank) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.status).toBe("draft");
      expect(question.source.kind).toBe("original");
      expect(question.reviewers).toEqual([]);
    }
  });

  it("provides fifty questions per grade (grade 3 has three extra boss top-ups) and at least eight per priority micro-skill", () => {
    for (const grade of grades) {
      const gradeQuestions = reviewCandidateQuestionBank.filter(
        (question) => question.grade === grade,
      );
      expect(gradeQuestions, `grade ${grade}`).toHaveLength(grade === 3 ? 53 : 50);

      for (const microSkill of PRIORITY_MICRO_SKILLS[grade]) {
        expect(
          gradeQuestions.filter((question) => question.microSkill === microSkill).length,
          `grade ${grade}: ${microSkill}`,
        ).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("contains no repeated question surface and exports one atomic import payload", () => {
    const surfaces = reviewCandidateQuestionBank.map((question) =>
      [
        question.prompt.trim().toLocaleLowerCase(),
        ...question.options.map((option) => option.text.trim().toLocaleLowerCase()).sort(),
      ].join(" | "),
    );
    expect(new Set(surfaces).size).toBe(203);

    const payload = toQuestionImportPayload(reviewCandidateQuestionBank);
    expect(validateQuestionImport(payload)).toEqual({ ok: true, questions: payload });
  });
});
