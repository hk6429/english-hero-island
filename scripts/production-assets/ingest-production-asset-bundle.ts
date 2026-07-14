import { readFile } from "node:fs/promises";
import {
  ProductionAssetBundleError,
  verifyProductionAssetBundle,
} from "./verify-production-asset-bundle";
import {
  invalidateProductionAssetVerification,
  withProductionAssetIngestLock,
  writeVerifiedProductionAssetBundle,
  type ProductionAssetVerificationReport,
} from "./write-verified-production-asset-bundle";

export async function ingestProductionAssetBundle(input: {
  questionBankPath: string;
  manifestPath: string;
  publicRoot: string;
  rightsRoot: string;
  productionBankPath: string;
  reportPath: string;
}): Promise<ProductionAssetVerificationReport> {
  return withProductionAssetIngestLock(input.reportPath, async (lock) => {
    await invalidateProductionAssetVerification(input.reportPath);
    const [questionBankBytes, manifestBytes] = await Promise.all([
      readFile(input.questionBankPath),
      readManifest(input.manifestPath),
    ]);
    const verified = await verifyProductionAssetBundle({
      questionBankBytes,
      manifestBytes,
      publicRoot: input.publicRoot,
      rightsRoot: input.rightsRoot,
    });

    return writeVerifiedProductionAssetBundle({
      verified,
      productionBankPath: input.productionBankPath,
      reportPath: input.reportPath,
      lock,
    });
  });
}

async function readManifest(manifestPath: string): Promise<Uint8Array> {
  try {
    return await readFile(manifestPath);
  } catch (error) {
    if (!isErrorCode(error, "ENOENT")) throw error;
    throw new ProductionAssetBundleError([
      {
        code: "PRODUCTION_ASSET_MANIFEST_MISSING",
        message:
          "尚未建立 artifacts/question-assets/production-assets.manifest.json；請先完成 49 筆正式素材與權利證據。",
      },
    ]);
  }
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
