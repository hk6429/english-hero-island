// @vitest-environment node

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyProductionAssetBundle } from "./verify-production-asset-bundle";

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function createSingleAudioFixture() {
  const root = await mkdtemp(join(tmpdir(), "english-hero-assets-"));
  const publicRoot = join(root, "public");
  const rightsRoot = join(root, "rights");
  const assetBytes = Buffer.from([
    0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x45, 0x4e,
  ]);
  const rightsBytes = Buffer.from("# Original asset declaration\n", "utf8");
  const assetSha256 = sha256(assetBytes);
  const rightsSha256 = sha256(rightsBytes);
  const publicLocator = `/assets/question-assets/${assetSha256}.mp3`;
  const rightsDocumentPath = `original/${rightsSha256}.md`;
  const questionBankBytes = Buffer.from(
    JSON.stringify([
      {
        id: "g3-listening-01",
        modality: "audio",
        audio: { src: "tts:cat", transcript: "cat" },
        source: {
          kind: "original",
          usageRights: "original-for-project",
        },
      },
    ]),
    "utf8",
  );
  const manifestBytes = Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      evidenceClass: "production_question_asset_bundle",
      questionBankSha256: sha256(questionBankBytes),
      assets: [
        {
          questionId: "g3-listening-01",
          assetKind: "audio",
          replacesPlaceholder: "tts:cat",
          publicLocator,
          sha256: assetSha256,
          byteLength: assetBytes.byteLength,
          mimeType: "audio/mpeg",
          rightsEvidence: {
            sourceKind: "original",
            usageRights: "original-for-project",
            documentPath: rightsDocumentPath,
            sha256: rightsSha256,
            byteLength: rightsBytes.byteLength,
          },
        },
      ],
    }),
    "utf8",
  );
  const assetPath = join(publicRoot, publicLocator.slice(1));
  const rightsPath = join(rightsRoot, rightsDocumentPath);

  return {
    root,
    publicRoot,
    rightsRoot,
    assetBytes,
    rightsBytes,
    assetPath,
    rightsPath,
    questionBankBytes,
    manifestBytes,
  };
}

describe("production question asset bundle", () => {
  it("reads the declared bytes and replaces a matching placeholder only after every receipt passes", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-assets-"));
    const publicRoot = join(root, "public");
    const rightsRoot = join(root, "rights");
    const assetBytes = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x45, 0x4e,
    ]);
    const rightsBytes = Buffer.from(
      "# Original asset declaration\n\nCreated for English Hero Island.\n",
      "utf8",
    );
    const assetSha256 = sha256(assetBytes);
    const rightsSha256 = sha256(rightsBytes);
    const publicLocator = `/assets/question-assets/${assetSha256}.mp3`;
    const rightsDocumentPath = `original/${rightsSha256}.md`;
    const questionBankBytes = Buffer.from(
      JSON.stringify([
        {
          id: "g3-listening-01",
          modality: "audio",
          audio: { src: "tts:cat", transcript: "cat" },
          source: {
            kind: "original",
            usageRights: "original-for-project",
          },
        },
        {
          id: "g3-text-01",
          modality: "text",
          source: {
            kind: "original",
            usageRights: "original-for-project",
          },
        },
      ]),
      "utf8",
    );
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        evidenceClass: "production_question_asset_bundle",
        questionBankSha256: sha256(questionBankBytes),
        assets: [
          {
            questionId: "g3-listening-01",
            assetKind: "audio",
            replacesPlaceholder: "tts:cat",
            publicLocator,
            sha256: assetSha256,
            byteLength: assetBytes.byteLength,
            mimeType: "audio/mpeg",
            rightsEvidence: {
              sourceKind: "original",
              usageRights: "original-for-project",
              documentPath: rightsDocumentPath,
              sha256: rightsSha256,
              byteLength: rightsBytes.byteLength,
            },
          },
        ],
      }),
      "utf8",
    );

    try {
      const assetPath = join(publicRoot, publicLocator.slice(1));
      const rightsPath = join(rightsRoot, rightsDocumentPath);
      await mkdir(dirname(assetPath), { recursive: true });
      await mkdir(dirname(rightsPath), { recursive: true });
      await writeFile(assetPath, assetBytes);
      await writeFile(rightsPath, rightsBytes);

      const verified = await verifyProductionAssetBundle({
        questionBankBytes,
        manifestBytes,
        publicRoot,
        rightsRoot,
      });

      expect(verified.summary).toEqual({
        status: "ready",
        questionCount: 2,
        verifiedAssetCount: 1,
        audioAssetCount: 1,
        imageAssetCount: 0,
        questionBankSha256: sha256(questionBankBytes),
        manifestSha256: sha256(manifestBytes),
      });
      expect(verified.productionQuestionBank).toEqual([
        expect.objectContaining({
          id: "g3-listening-01",
          audio: { src: publicLocator, transcript: "cat" },
        }),
        expect.objectContaining({ id: "g3-text-01", modality: "text" }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("allows multiple questions to reuse one identical content-addressed asset receipt", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-assets-"));
    const publicRoot = join(root, "public");
    const rightsRoot = join(root, "rights");
    const assetBytes = Buffer.from([
      0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x45, 0x4e,
    ]);
    const rightsBytes = Buffer.from("# Original asset declaration\n", "utf8");
    const assetSha256 = sha256(assetBytes);
    const rightsSha256 = sha256(rightsBytes);
    const publicLocator = `/assets/question-assets/${assetSha256}.mp3`;
    const rightsDocumentPath = `original/${rightsSha256}.md`;
    const source = {
      kind: "original",
      usageRights: "original-for-project",
    };
    const questionBankBytes = Buffer.from(
      JSON.stringify([
        {
          id: "g3-listening-01",
          modality: "audio",
          audio: { src: "tts:cat", transcript: "cat" },
          source,
        },
        {
          id: "g3-listening-02",
          modality: "audio",
          audio: { src: "tts:cat", transcript: "cat" },
          source,
        },
      ]),
      "utf8",
    );
    const assetReceipt = {
      assetKind: "audio",
      publicLocator,
      sha256: assetSha256,
      byteLength: assetBytes.byteLength,
      mimeType: "audio/mpeg",
      rightsEvidence: {
        sourceKind: "original",
        usageRights: "original-for-project",
        documentPath: rightsDocumentPath,
        sha256: rightsSha256,
        byteLength: rightsBytes.byteLength,
      },
    };
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        evidenceClass: "production_question_asset_bundle",
        questionBankSha256: sha256(questionBankBytes),
        assets: [
          {
            ...assetReceipt,
            questionId: "g3-listening-01",
            replacesPlaceholder: "tts:cat",
          },
          {
            ...assetReceipt,
            questionId: "g3-listening-02",
            replacesPlaceholder: "tts:cat",
          },
        ],
      }),
      "utf8",
    );

    try {
      const assetPath = join(publicRoot, publicLocator.slice(1));
      const rightsPath = join(rightsRoot, rightsDocumentPath);
      await mkdir(dirname(assetPath), { recursive: true });
      await mkdir(dirname(rightsPath), { recursive: true });
      await writeFile(assetPath, assetBytes);
      await writeFile(rightsPath, rightsBytes);

      const verified = await verifyProductionAssetBundle({
        questionBankBytes,
        manifestBytes,
        publicRoot,
        rightsRoot,
      });

      expect(verified.summary.verifiedAssetCount).toBe(2);
      expect(
        verified.productionQuestionBank.map((question) =>
          (question.audio as { src: string }).src,
        ),
      ).toEqual([publicLocator, publicLocator]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns a structured blocker when the declared asset file is missing", async () => {
    const fixture = await createSingleAudioFixture();

    try {
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(fixture.rightsPath, fixture.rightsBytes);

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes: fixture.manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "ASSET_FILE_MISSING",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("surfaces an operational read failure instead of misclassifying it as content evidence", async () => {
    const fixture = await createSingleAudioFixture();

    try {
      await mkdir(fixture.assetPath, { recursive: true });

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes: fixture.manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({ code: "EISDIR" });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("rejects duplicate evidence rows for the same question and asset kind", async () => {
    const fixture = await createSingleAudioFixture();
    const manifest = JSON.parse(fixture.manifestBytes.toString("utf8")) as {
      assets: Array<Record<string, unknown>>;
    };
    manifest.assets.push({
      ...manifest.assets[0],
      publicLocator: `/assets/question-assets/${"b".repeat(64)}.mp3`,
      sha256: "b".repeat(64),
    });
    const duplicateManifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");

    try {
      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes: duplicateManifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "DUPLICATE_QUESTION_ASSET",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("reports every question that is still missing a required asset binding", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-assets-"));
    const questionBankBytes = Buffer.from(
      JSON.stringify([
        {
          id: "g3-listening-01",
          modality: "audio",
          audio: { src: "tts:cat", transcript: "cat" },
          source: {
            kind: "original",
            usageRights: "original-for-project",
          },
        },
        {
          id: "g3-image-01",
          modality: "image",
          image: { src: "scene:red-hat", alt: "一頂紅帽子" },
          source: {
            kind: "original",
            usageRights: "original-for-project",
          },
        },
      ]),
      "utf8",
    );
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        evidenceClass: "production_question_asset_bundle",
        questionBankSha256: sha256(questionBankBytes),
        assets: [],
      }),
      "utf8",
    );

    try {
      await expect(
        verifyProductionAssetBundle({
          questionBankBytes,
          manifestBytes,
          publicRoot: join(root, "public"),
          rightsRoot: join(root, "rights"),
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "ASSET_EVIDENCE_MISSING",
            questionId: "g3-listening-01",
          }),
          expect.objectContaining({
            code: "ASSET_EVIDENCE_MISSING",
            questionId: "g3-image-01",
          }),
        ],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects duplicate question identifiers before any asset can be verified", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-assets-"));
    const duplicateQuestion = {
      id: "g3-listening-01",
      modality: "audio",
      audio: { src: "tts:cat", transcript: "cat" },
      source: {
        kind: "original",
        usageRights: "original-for-project",
      },
    };
    const questionBankBytes = Buffer.from(
      JSON.stringify([duplicateQuestion, duplicateQuestion]),
      "utf8",
    );
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        evidenceClass: "production_question_asset_bundle",
        questionBankSha256: sha256(questionBankBytes),
        assets: [],
      }),
      "utf8",
    );

    try {
      await expect(
        verifyProductionAssetBundle({
          questionBankBytes,
          manifestBytes,
          publicRoot: join(root, "public"),
          rightsRoot: join(root, "rights"),
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "DUPLICATE_QUESTION_ID",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the real 200-question bank blocked with an exact 24-audio and 25-image inventory", async () => {
    const questionBankBytes = await readFile(
      resolve(
        process.cwd(),
        "artifacts/question-bank/review-candidate-question-bank.json",
      ),
    );
    const manifestBytes = Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        evidenceClass: "production_question_asset_bundle",
        questionBankSha256: sha256(questionBankBytes),
        assets: [],
      }),
      "utf8",
    );

    try {
      await verifyProductionAssetBundle({
        questionBankBytes,
        manifestBytes,
        publicRoot: resolve(process.cwd(), "public"),
        rightsRoot: resolve(process.cwd(), "artifacts/question-assets/rights"),
      });
      throw new Error("現有題庫不應通過正式素材驗證。");
    } catch (error) {
      expect(error).toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "ASSET_EVIDENCE_MISSING" }),
        ]),
      });
      const issues = (error as {
        issues: Array<{ questionId?: string; assetKind?: string }>;
      }).issues;
      expect(issues).toHaveLength(49);
      expect(new Set(issues.map(({ questionId }) => questionId))).toHaveLength(49);
      expect(issues.filter(({ assetKind }) => assetKind === "audio")).toHaveLength(24);
      expect(issues.filter(({ assetKind }) => assetKind === "image")).toHaveLength(25);
    }
  });

  it("detects a same-length asset byte mutation through SHA-256", async () => {
    const fixture = await createSingleAudioFixture();
    const mutatedBytes = Buffer.from(fixture.assetBytes);
    mutatedBytes[mutatedBytes.length - 1] ^= 0x01;

    try {
      await mkdir(dirname(fixture.assetPath), { recursive: true });
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(fixture.assetPath, mutatedBytes);
      await writeFile(fixture.rightsPath, fixture.rightsBytes);

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes: fixture.manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "ASSET_HASH_MISMATCH",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("detects a declared audio MIME that does not match the file magic bytes", async () => {
    const fixture = await createSingleAudioFixture();
    const manifest = JSON.parse(fixture.manifestBytes.toString("utf8")) as {
      assets: Array<{
        mimeType: string;
        publicLocator: string;
      }>;
    };
    manifest.assets[0].mimeType = "audio/wav";
    manifest.assets[0].publicLocator = fixture.assetPath
      .replace(fixture.publicRoot, "")
      .replace(/\.mp3$/, ".wav");
    const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
    const wavPath = join(
      fixture.publicRoot,
      manifest.assets[0].publicLocator.replace(/^\//, ""),
    );

    try {
      await mkdir(dirname(wavPath), { recursive: true });
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(wavPath, fixture.assetBytes);
      await writeFile(fixture.rightsPath, fixture.rightsBytes);

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "ASSET_MIME_MISMATCH",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("rejects a nested public locator even when its basename and bytes are valid", async () => {
    const fixture = await createSingleAudioFixture();
    const manifest = JSON.parse(fixture.manifestBytes.toString("utf8")) as {
      assets: Array<{
        publicLocator: string;
        sha256: string;
      }>;
    };
    manifest.assets[0].publicLocator =
      `/assets/question-assets/nested/${manifest.assets[0].sha256}.mp3`;
    const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
    const nestedAssetPath = join(
      fixture.publicRoot,
      manifest.assets[0].publicLocator.replace(/^\//, ""),
    );

    try {
      await mkdir(dirname(nestedAssetPath), { recursive: true });
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(nestedAssetPath, fixture.assetBytes);
      await writeFile(fixture.rightsPath, fixture.rightsBytes);

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "ASSET_LOCATOR_NOT_IMMUTABLE",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("detects a same-length rights evidence byte mutation through SHA-256", async () => {
    const fixture = await createSingleAudioFixture();
    const mutatedRightsBytes = Buffer.from(fixture.rightsBytes);
    mutatedRightsBytes[mutatedRightsBytes.length - 1] ^= 0x01;

    try {
      await mkdir(dirname(fixture.assetPath), { recursive: true });
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(fixture.assetPath, fixture.assetBytes);
      await writeFile(fixture.rightsPath, mutatedRightsBytes);

      await expect(
        verifyProductionAssetBundle({
          questionBankBytes: fixture.questionBankBytes,
          manifestBytes: fixture.manifestBytes,
          publicRoot: fixture.publicRoot,
          rightsRoot: fixture.rightsRoot,
        }),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            code: "RIGHTS_EVIDENCE_HASH_MISMATCH",
            questionId: "g3-listening-01",
          }),
        ],
      });
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("allows an original question to use a separately licensed production asset", async () => {
    const fixture = await createSingleAudioFixture();
    const manifest = JSON.parse(fixture.manifestBytes.toString("utf8")) as {
      assets: Array<{
        rightsEvidence: {
          sourceKind: string;
          usageRights: string;
        };
      }>;
    };
    manifest.assets[0].rightsEvidence.sourceKind = "licensed";
    manifest.assets[0].rightsEvidence.usageRights = "licensed-for-publication";
    const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");

    try {
      await mkdir(dirname(fixture.assetPath), { recursive: true });
      await mkdir(dirname(fixture.rightsPath), { recursive: true });
      await writeFile(fixture.assetPath, fixture.assetBytes);
      await writeFile(fixture.rightsPath, fixture.rightsBytes);

      const verified = await verifyProductionAssetBundle({
        questionBankBytes: fixture.questionBankBytes,
        manifestBytes,
        publicRoot: fixture.publicRoot,
        rightsRoot: fixture.rightsRoot,
      });

      expect(verified.summary.status).toBe("ready");
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});
