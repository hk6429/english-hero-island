import { resolve } from "node:path";
import { ingestProductionAssetBundle } from "./production-assets/ingest-production-asset-bundle";
import { ProductionAssetBundleError } from "./production-assets/verify-production-asset-bundle";

const questionBankPath = resolve(
  process.cwd(),
  "artifacts/question-bank/review-candidate-question-bank.json",
);
const manifestPath = resolve(
  process.cwd(),
  "artifacts/question-assets/production-assets.manifest.json",
);
const publicRoot = resolve(process.cwd(), "public");
const rightsRoot = resolve(process.cwd(), "artifacts/question-assets/rights");
const productionBankPath = resolve(
  process.cwd(),
  "artifacts/question-bank/production-question-bank.json",
);
const reportPath = resolve(
  process.cwd(),
  "artifacts/question-assets/verification-report.json",
);

try {
  const report = await ingestProductionAssetBundle({
    questionBankPath,
    manifestPath,
    publicRoot,
    rightsRoot,
    productionBankPath,
    reportPath,
  });

  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (error instanceof ProductionAssetBundleError) {
    console.error(
      JSON.stringify(
        {
          status: "blocked",
          evidenceClass: "production_question_asset_bundle",
          issues: error.issues,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    console.error(
      JSON.stringify(
        {
          status: "error",
          code: "PRODUCTION_ASSET_INGEST_OPERATIONAL_FAILURE",
          message: error instanceof Error ? error.message : "未知的正式素材匯入錯誤。",
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  }
}
