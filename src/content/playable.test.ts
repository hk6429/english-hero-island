import { describe, expect, it } from "vitest";
import { buildDiagnostic } from "@/domain/session-builder/build-diagnostic";
import { buildMission } from "@/domain/session-builder/build-mission";
import { PRIORITY_MICRO_SKILLS } from "@/domain/session-builder/grade-priorities";
import { questionSchema, type Grade } from "@/domain/questions/question-schema";
import { playableQuestionBank } from "./playable";

const grades: Grade[] = [3, 4, 5, 6];
const focusByGrade: Readonly<Record<Grade, string>> = {
  3: "cvc-decoding",
  4: "yes-no-questions",
  5: "age-and-can",
  6: "present-progressive",
};

describe("playable question bank", () => {
  it("serves the full 200 original drafts, honestly unreviewed", () => {
    expect(playableQuestionBank).toHaveLength(200);
    expect(new Set(playableQuestionBank.map((question) => question.id)).size).toBe(200);

    for (const question of playableQuestionBank) {
      expect(questionSchema.safeParse(question).success, question.id).toBe(true);
      // 一律誠實標為草稿：不偽造治理複核
      expect(question.status).toBe("draft");
      expect(question.reviewers).toEqual([]);
      expect(question.source.kind).toBe("original");
    }
  });

  it("gives every grade fifty questions", () => {
    for (const grade of grades) {
      expect(
        playableQuestionBank.filter((question) => question.grade === grade),
        `grade ${grade}`,
      ).toHaveLength(50);
    }
  });

  it("builds a complete diagnostic and the focus mission per grade in pilot mode", () => {
    for (const grade of grades) {
      const diagnostic = buildDiagnostic({
        grade,
        bank: playableQuestionBank,
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
        bank: playableQuestionBank,
        contentMode: "pilot",
        excludeQuestionIds: [],
      });
      expect(mission.ok, `grade ${grade} mission`).toBe(true);
      if (mission.ok) {
        expect(mission.practice.length).toBeGreaterThanOrEqual(3);
        expect(mission.boss.purpose).toBe("boss");
      }
    }
  });
});
