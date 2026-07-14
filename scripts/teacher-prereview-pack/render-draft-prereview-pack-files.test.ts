import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDraftPrereviewPack } from "./build-draft-prereview-pack";
import { renderDraftPrereviewPackFiles } from "./render-draft-prereview-pack-files";

const sourceBytes = readFileSync(
  resolve(process.cwd(), "artifacts/question-bank/review-candidate-question-bank.json"),
);
const pack = buildDraftPrereviewPack(sourceBytes);
const rendered = renderDraftPrereviewPackFiles(pack, "2026-07-14T10:00:00.000Z");

describe("renderDraftPrereviewPackFiles", () => {
  it("renders the complete transparent draft file set", () => {
    expect([...rendered.keys()].sort()).toEqual([
      "README.md",
      "asset-blockers.csv",
      "draft-questions.json",
      "manifest.json",
      "production-assets.manifest.template.json",
      "questions-for-review.csv",
      "teacher-01.responses.unsigned.csv",
      "teacher-02.responses.unsigned.csv",
      "validation-report.json",
    ]);

    const manifest = JSON.parse(rendered.get("manifest.json") ?? "null") as Record<
      string,
      unknown
    >;
    expect(manifest).toMatchObject({
      evidenceClass: "draft_prereview_pack",
      formalReviewEligible: false,
      generatedAt: "2026-07-14T10:00:00.000Z",
      questionCount: 200,
      requiredReviewerCount: 2,
      cryptographicSignature: null,
    });
    expect(manifest.packId).toMatch(/^draft-[a-f0-9]{16}$/);
  });

  it("creates a 200-row reading CSV with hashes and explicit asset blockers", () => {
    const questionsCsv = rendered.get("questions-for-review.csv") ?? "";
    const blockerCsv = rendered.get("asset-blockers.csv") ?? "";

    expect(questionsCsv.trim().split("\n")).toHaveLength(201);
    expect(questionsCsv).toContain("question_content_sha256");
    expect(questionsCsv).toContain("asset_status");
    expect(blockerCsv.trim().split("\n")).toHaveLength(50);
    expect(blockerCsv).toContain("placeholder_asset_requires_production_and_integrity_evidence");
  });

  it("prefills only immutable worksheet references and leaves teacher judgments blank", () => {
    const teacherOne = rendered.get("teacher-01.responses.unsigned.csv") ?? "";
    const teacherTwo = rendered.get("teacher-02.responses.unsigned.csv") ?? "";
    const [header, firstRow] = teacherOne.trimEnd().split("\n");

    expect(teacherOne.trimEnd().split("\n")).toHaveLength(201);
    expect(teacherTwo.trimEnd().split("\n")).toHaveLength(201);
    expect(header).not.toMatch(
      /reviewer_id|reviewed_at|review_time|timestamp|vote_count|approval_count|signature/i,
    );
    expect(firstRow).toContain("teacher-01");
    expect(firstRow?.endsWith(',""')).toBe(true);
    expect(teacherTwo).toContain("teacher-02");
    expect(teacherOne).not.toContain("teacher-02");
  });

  it("states every formal-review blocker in the readme and validation report", () => {
    const readme = rendered.get("README.md") ?? "";
    const report = JSON.parse(rendered.get("validation-report.json") ?? "null") as {
      status: string;
      blockedAssetCount: number;
      formalReviewEligible: boolean;
    };

    expect(readme).toContain("不是正式複核包");
    expect(readme).toContain("49 題");
    expect(readme).toContain("專用 Supabase");
    expect(readme).toContain("兩位英語教師");
    expect(report).toEqual(
      expect.objectContaining({
        status: "draft_only_blocked_from_formal_review",
        blockedAssetCount: 49,
        formalReviewEligible: false,
      }),
    );
  });

  it("renders a 49-row production asset manifest intake without fabricating receipts", () => {
    const intake = JSON.parse(
      rendered.get("production-assets.manifest.template.json") ?? "null",
    ) as {
      schemaVersion: number;
      evidenceClass: string;
      questionBankSha256: string;
      assets: Array<{
        questionId: string;
        assetKind: string;
        replacesPlaceholder: string;
        publicLocator: string;
        sha256: string;
        byteLength: number;
        rightsEvidence: {
          sourceKind: string;
          usageRights: string;
          documentPath: string;
          sha256: string;
          byteLength: number;
        };
      }>;
    };

    expect(intake).toMatchObject({
      schemaVersion: 1,
      evidenceClass: "production_question_asset_bundle",
      questionBankSha256: pack.sourceImport.sha256,
    });
    expect(intake.assets).toHaveLength(49);
    expect(intake.assets.filter(({ assetKind }) => assetKind === "audio")).toHaveLength(24);
    expect(intake.assets.filter(({ assetKind }) => assetKind === "image")).toHaveLength(25);
    expect(new Set(intake.assets.map(({ questionId }) => questionId))).toHaveLength(49);
    expect(
      intake.assets.every(
        (asset) =>
          /^(tts|scene):/.test(asset.replacesPlaceholder) &&
          asset.publicLocator === "" &&
          asset.sha256 === "" &&
          asset.byteLength === 0 &&
          asset.rightsEvidence.sourceKind === "" &&
          asset.rightsEvidence.usageRights === "" &&
          asset.rightsEvidence.documentPath === "" &&
          asset.rightsEvidence.sha256 === "" &&
          asset.rightsEvidence.byteLength === 0,
      ),
    ).toBe(true);
  });
});
