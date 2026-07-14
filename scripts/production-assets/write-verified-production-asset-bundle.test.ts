// @vitest-environment node

import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VerifiedProductionAssetBundle } from "./verify-production-asset-bundle";
import {
  invalidateProductionAssetVerification,
  writeVerifiedProductionAssetBundle,
} from "./write-verified-production-asset-bundle";

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

const verifiedBundle: VerifiedProductionAssetBundle = {
  summary: {
    status: "ready",
    questionCount: 1,
    verifiedAssetCount: 1,
    audioAssetCount: 1,
    imageAssetCount: 0,
    questionBankSha256: "a".repeat(64),
    manifestSha256: "b".repeat(64),
  },
  productionQuestionBank: [
    {
      id: "g3-listening-01",
      modality: "audio",
      audio: { src: `/assets/question-assets/${"c".repeat(64)}.mp3` },
    },
  ],
};

describe("writeVerifiedProductionAssetBundle", () => {
  it("invalidates the prior commit marker before a new ingest attempt", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-output-"));
    const bankPath = join(root, "production-question-bank.json");
    const reportPath = join(root, "verification-report.json");

    try {
      await writeFile(bankPath, "old bank", "utf8");
      await writeFile(reportPath, "old report", "utf8");

      await invalidateProductionAssetVerification(reportPath);

      await expect(readFile(reportPath, "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(readFile(bankPath, "utf8")).resolves.toBe("old bank");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("commits a byte-bound report last and leaves no staged files", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-output-"));
    const bankPath = join(root, "bank", "production-question-bank.json");
    const reportPath = join(root, "evidence", "verification-report.json");

    try {
      const report = await writeVerifiedProductionAssetBundle({
        verified: verifiedBundle,
        productionBankPath: bankPath,
        reportPath,
        generatedAt: "2026-07-14T12:00:00.000Z",
      });
      const bankBytes = await readFile(bankPath);
      const persistedReport = JSON.parse(await readFile(reportPath, "utf8")) as {
        productionQuestionBankSha256: string;
        productionQuestionBankByteLength: number;
      };

      expect(report).toMatchObject({
        generatedAt: "2026-07-14T12:00:00.000Z",
        productionQuestionBankSha256: sha256(bankBytes),
        productionQuestionBankByteLength: bankBytes.byteLength,
      });
      expect(persistedReport).toEqual(
        expect.objectContaining({
          productionQuestionBankSha256: sha256(bankBytes),
          productionQuestionBankByteLength: bankBytes.byteLength,
        }),
      );
      expect((await readdir(join(root, "bank"))).some((name) => name.includes(".tmp"))).toBe(
        false,
      );
      expect(
        (await readdir(join(root, "evidence"))).some((name) => name.includes(".tmp")),
      ).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses a concurrent writer without invalidating the active writer report", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-output-"));
    const bankPath = join(root, "production-question-bank.json");
    const reportPath = join(root, "verification-report.json");

    try {
      await writeFile(reportPath, "active report", "utf8");
      await writeFile(`${reportPath}.lock`, "active ingest", "utf8");

      await expect(
        writeVerifiedProductionAssetBundle({
          verified: verifiedBundle,
          productionBankPath: bankPath,
          reportPath,
        }),
      ).rejects.toThrow("另一個正式素材匯入仍在寫入輸出");
      await expect(readFile(reportPath, "utf8")).resolves.toBe("active report");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
