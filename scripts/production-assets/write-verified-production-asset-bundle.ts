import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";
import type { VerifiedProductionAssetBundle } from "./verify-production-asset-bundle";

const productionAssetIngestLockToken = Symbol("production-asset-ingest-lock");

export type ProductionAssetIngestLock = Readonly<{
  reportPath: string;
  token: symbol;
}>;

export type ProductionAssetVerificationReport = Readonly<{
  schemaVersion: 1;
  evidenceClass: "verified_production_question_asset_bundle";
  generatedAt: string;
  status: "ready";
  questionCount: number;
  verifiedAssetCount: number;
  audioAssetCount: number;
  imageAssetCount: number;
  questionBankSha256: string;
  manifestSha256: string;
  productionQuestionBankSha256: string;
  productionQuestionBankByteLength: number;
}>;

export async function invalidateProductionAssetVerification(
  reportPath: string,
): Promise<void> {
  await rm(reportPath, { force: true });
}

export async function withProductionAssetIngestLock<T>(
  reportPath: string,
  operation: (lock: ProductionAssetIngestLock) => Promise<T>,
): Promise<T> {
  const lockPath = `${reportPath}.lock`;
  await mkdir(dirname(reportPath), { recursive: true });

  let lockHandle: FileHandle;
  try {
    lockHandle = await open(lockPath, "wx");
  } catch (error) {
    if (isErrorCode(error, "EEXIST")) {
      throw new Error(
        "另一個正式素材匯入仍在寫入輸出；確認該程序結束後再重試。",
      );
    }
    throw error;
  }

  try {
    await lockHandle.writeFile(
      `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
      "utf8",
    );
  } catch (error) {
    await releaseProductionAssetIngestLock(lockHandle, lockPath).catch(
      () => undefined,
    );
    throw error;
  }

  const lock: ProductionAssetIngestLock = {
    reportPath,
    token: productionAssetIngestLockToken,
  };
  let operationFailed = false;
  try {
    return await operation(lock);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    if (operationFailed) {
      await releaseProductionAssetIngestLock(lockHandle, lockPath).catch(
        () => undefined,
      );
    } else {
      await releaseProductionAssetIngestLock(lockHandle, lockPath);
    }
  }
}

export async function writeVerifiedProductionAssetBundle(input: {
  verified: VerifiedProductionAssetBundle;
  productionBankPath: string;
  reportPath: string;
  generatedAt?: string;
  lock?: ProductionAssetIngestLock;
}): Promise<ProductionAssetVerificationReport> {
  if (input.lock === undefined) {
    return withProductionAssetIngestLock(input.reportPath, (lock) =>
      writeVerifiedProductionAssetBundle({ ...input, lock }),
    );
  }
  if (
    input.lock.token !== productionAssetIngestLockToken ||
    input.lock.reportPath !== input.reportPath
  ) {
    throw new Error("正式素材匯入鎖與驗證報告路徑不一致。");
  }

  const productionBankBytes = Buffer.from(
    `${JSON.stringify(input.verified.productionQuestionBank, null, 2)}\n`,
    "utf8",
  );
  const report: ProductionAssetVerificationReport = {
    schemaVersion: 1,
    evidenceClass: "verified_production_question_asset_bundle",
    generatedAt: new Date(input.generatedAt ?? Date.now()).toISOString(),
    ...input.verified.summary,
    productionQuestionBankSha256: sha256(productionBankBytes),
    productionQuestionBankByteLength: productionBankBytes.byteLength,
  };
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  const token = `${process.pid}-${randomUUID()}`;
  const productionBankTempPath = `${input.productionBankPath}.${token}.tmp`;
  const reportTempPath = `${input.reportPath}.${token}.tmp`;

  await Promise.all([
    mkdir(dirname(input.productionBankPath), { recursive: true }),
    mkdir(dirname(input.reportPath), { recursive: true }),
  ]);

  try {
    await invalidateProductionAssetVerification(input.reportPath);
    await Promise.all([
      writeFile(productionBankTempPath, productionBankBytes),
      writeFile(reportTempPath, reportBytes),
    ]);
    await rename(productionBankTempPath, input.productionBankPath);
    await rename(reportTempPath, input.reportPath);
    return report;
  } catch (error) {
    await Promise.allSettled([
      rm(productionBankTempPath, { force: true }),
      rm(reportTempPath, { force: true }),
    ]);
    throw error;
  }
}

async function releaseProductionAssetIngestLock(
  lockHandle: FileHandle,
  lockPath: string,
): Promise<void> {
  const results = await Promise.allSettled([
    lockHandle.close(),
    rm(lockPath, { force: true }),
  ]);
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);
  if (failures.length > 0) {
    throw new AggregateError(failures, "無法完整釋放正式素材匯入鎖。");
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
