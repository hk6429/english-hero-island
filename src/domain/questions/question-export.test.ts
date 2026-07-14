import { describe, expect, it } from "vitest";
import { makeQuestion } from "@/test/fixtures/question";
import { toQuestionImportPayload, validateQuestionImport } from "./question-import";

describe("question draft export", () => {
  it("removes governance fields and remains valid for atomic import", () => {
    const question = makeQuestion({
      author: { id: "local-author", displayName: "本機作者" },
      reviewers: [],
      status: "draft",
      version: 1,
    });

    const payload = toQuestionImportPayload([question]);

    expect(payload).toHaveLength(1);
    expect(payload[0]).not.toHaveProperty("version");
    expect(payload[0]).not.toHaveProperty("status");
    expect(payload[0]).not.toHaveProperty("author");
    expect(payload[0]).not.toHaveProperty("reviewers");
    expect(validateQuestionImport(payload)).toEqual({ ok: true, questions: payload });
  });
});
