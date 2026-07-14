import { describe, expect, it } from "vitest";
import { buildDiagnostic } from "@/domain/session-builder/build-diagnostic";
import { buildMission } from "@/domain/session-builder/build-mission";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { questionSchema, type Grade } from "@/domain/questions/question-schema";
import { pilotQuestionBank } from "./index";

const grades: Grade[] = [3, 4, 5, 6];
const focusByGrade: Readonly<Record<Grade, string>> = {
  3: "cvc-decoding",
  4: "yes-no-questions",
  5: "age-and-can",
  6: "present-progressive",
};

describe("pilot question bank", () => {
  it("contains sixty unique schema-valid draft questions", () => {
    expect(pilotQuestionBank).toHaveLength(60);
    expect(new Set(pilotQuestionBank.map((question) => question.id)).size).toBe(60);

    for (const question of pilotQuestionBank) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      expect(question.status).toBe("draft");
      expect(question.reviewers).toEqual([]);
    }
  });

  it("gives every grade five diagnostic skills and one complete pilot mission", () => {
    for (const grade of grades) {
      expect(pilotQuestionBank.filter((question) => question.grade === grade)).toHaveLength(15);

      const diagnostic = buildDiagnostic({
        grade,
        bank: pilotQuestionBank,
        contentMode: "pilot",
      });
      expect(diagnostic.ok, `grade ${grade} diagnostic`).toBe(true);
      if (diagnostic.ok) {
        expect(diagnostic.questions.map((question) => question.microSkill)).toEqual(
          PRIORITY_MICRO_SKILLS[grade],
        );
      }

      const mission = buildMission({
        grade,
        microSkill: focusByGrade[grade],
        bank: pilotQuestionBank,
        contentMode: "pilot",
        excludeQuestionIds: [],
      });
      expect(mission.ok, `grade ${grade} mission`).toBe(true);
      if (mission.ok) {
        expect(mission.practice).toHaveLength(5);
        expect(mission.boss.purpose).toBe("boss");
      }
    }
  });

  it("distributes correct answers across at least three positions in every grade", () => {
    for (const grade of grades) {
      const gradeQuestions = pilotQuestionBank.filter((question) => question.grade === grade);
      const answerPositions = gradeQuestions.map((question) =>
        question.options.findIndex((option) => option.id === question.correctOptionId),
      );

      expect(new Set(answerPositions).size, `grade ${grade} answer positions`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });
});
