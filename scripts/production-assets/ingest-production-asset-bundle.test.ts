// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ingestProductionAssetBundle } from "./ingest-production-asset-bundle";

describe("ingestProductionAssetBundle", () => {
  it("takes the ingest lock before invalidating an active verification report", async () => {
    const root = await mkdtemp(join(tmpdir(), "english-hero-ingest-"));
    const reportPath = join(root, "verification-report.json");

    try {
      await writeFile(reportPath, "active report", "utf8");
      await writeFile(`${reportPath}.lock`, "active ingest", "utf8");

      await expect(
        ingestProductionAssetBundle({
          questionBankPath: join(root, "missing-question-bank.json"),
          manifestPath: join(root, "missing-manifest.json"),
          publicRoot: join(root, "public"),
          rightsRoot: join(root, "rights"),
          productionBankPath: join(root, "production-question-bank.json"),
          reportPath,
        }),
      ).rejects.toThrow("另一個正式素材匯入仍在寫入輸出");
      await expect(readFile(reportPath, "utf8")).resolves.toBe("active report");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
