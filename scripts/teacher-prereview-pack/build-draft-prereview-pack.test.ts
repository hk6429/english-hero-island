import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDraftPrereviewPack } from "./build-draft-prereview-pack";

const sourcePath = resolve(
  process.cwd(),
  "artifacts/question-bank/review-candidate-question-bank.json",
);

function loadSource() {
  return readFileSync(sourcePath);
}

describe("buildDraftPrereviewPack", () => {
  it("builds a non-formal prereview pack only when the 200-question grade quota is complete", () => {
    const pack = buildDraftPrereviewPack(loadSource());

    expect(pack.evidenceClass).toBe("draft_prereview_pack");
    expect(pack.formalReviewEligible).toBe(false);
    expect(pack.questionCount).toBe(200);
    expect(pack.gradeCounts).toEqual({ 3: 50, 4: 50, 5: 50, 6: 50 });
    expect(pack.questions).toHaveLength(200);
    expect(JSON.stringify(pack)).not.toMatch(/frozen|RFC\s*8785|human.reviewed/i);
  });

  it("rejects an incomplete grade quota with actionable counts", () => {
    const questions = JSON.parse(loadSource().toString("utf8")) as Array<{ grade: number }>;
    questions.splice(
      questions.findIndex(({ grade }) => grade === 3),
      1,
    );

    expect(() => buildDraftPrereviewPack(Buffer.from(JSON.stringify(questions)))).toThrowError(
      /實際 199 題.*三年級 49 題.*四年級 50 題.*五年級 50 題.*六年級 50 題/,
    );
  });

  it("records a byte-exact source hash and a stable content hash for every question", () => {
    const sourceBytes = loadSource();
    const pack = buildDraftPrereviewPack(sourceBytes);

    expect(pack.sourceImport).toEqual({
      byteLength: sourceBytes.byteLength,
      sha256: createHash("sha256").update(sourceBytes).digest("hex"),
    });
    expect(pack.questionContentHashing).toEqual({
      algorithm: "sha256",
      serialization: "stable-json-key-sort-v1",
    });
    expect(pack.questions.every(({ contentSha256 }) => /^[a-f0-9]{64}$/.test(contentSha256))).toBe(
      true,
    );
    expect(new Set(pack.questions.map(({ contentSha256 }) => contentSha256))).toHaveLength(200);
  });

  it("blocks all placeholder audio and image assets from formal review", () => {
    const pack = buildDraftPrereviewPack(loadSource());

    expect(pack.assetReadiness).toEqual({
      readyQuestionCount: 151,
      blockedQuestionCount: 49,
      placeholderAudioCount: 24,
      placeholderImageCount: 25,
    });
    expect(pack.assetBlockers).toHaveLength(49);
    expect(pack.assetBlockers.every(({ placeholderSrc }) => /^(tts|scene):/.test(placeholderSrc))).toBe(
      true,
    );
    expect(pack.assetBlockers.every(({ questionId }) => questionId.length > 0)).toBe(true);
    expect(new Set(pack.assetBlockers.map(({ questionId }) => questionId))).toHaveLength(49);
    expect(pack.formalReviewEligible).toBe(false);
  });

  it("provides two empty teacher response tables without trusted identity or decision evidence", () => {
    const pack = buildDraftPrereviewPack(loadSource());

    expect(pack.teacherResponseTables.map(({ fileName }) => fileName)).toEqual([
      "teacher-01.responses.unsigned.csv",
      "teacher-02.responses.unsigned.csv",
    ]);
    expect(pack.teacherResponseTables.every(({ rows }) => rows.length === 0)).toBe(true);
    expect(pack.teacherResponseTables[0]?.columns).toEqual([
      "worksheet_id",
      "reviewer_slot",
      "pack_id",
      "question_id",
      "question_content_sha256",
      "english_correct",
      "answer_unique",
      "explanation_correct",
      "hint_safe",
      "asset_consistent",
      "rights_clear",
      "age_appropriate",
      "verdict",
      "review_note",
      "failed_criteria_notes",
      "suggested_revision",
    ]);
    expect(JSON.stringify(pack.teacherResponseTables)).not.toMatch(
      /reviewer_id|reviewed_at|review_time|timestamp|vote_count|approval_count|signature/i,
    );
  });

  it("declares the evidence that this draft pack does not contain", () => {
    const pack = buildDraftPrereviewPack(loadSource());

    expect(pack.evidenceLimitations).toEqual({
      databaseVersionLock: "not_included",
      externalCanonicalizationStandard: "not_claimed",
      humanTeacherDecisions: "not_included",
      productionAssetIntegrity: "placeholder_assets_blocked",
    });
  });
});
