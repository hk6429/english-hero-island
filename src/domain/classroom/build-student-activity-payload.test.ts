import { describe, expect, it } from "vitest";
import { pilotQuestionBank } from "@/content/pilot";
import { buildStudentActivityPayload } from "./build-student-activity-payload";

describe("buildStudentActivityPayload", () => {
  it("omits answers, explanations, hints, sources, and reviews before a classroom response", () => {
    const question = pilotQuestionBank.find(
      (candidate) => candidate.id === "g4-yes-no-practice-01",
    );
    if (!question) throw new Error("Expected pilot question fixture");

    const payload = buildStudentActivityPayload(question);

    expect(payload).toEqual({
      id: question.id,
      version: question.version,
      grade: question.grade,
      microSkill: question.microSkill,
      modality: question.modality,
      questionType: question.questionType,
      purpose: question.purpose,
      prompt: question.prompt,
      options: question.options,
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /correctOptionId|explanation|hints|source|reviewers|reviewedAt|publishedAt|transcript/,
    );
  });
});
