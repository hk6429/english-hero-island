import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewCandidateQuestionBank } from "../src/content/review-candidates";
import {
  toQuestionImportPayload,
  validateQuestionImport,
} from "../src/domain/questions/question-import";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(
  projectRoot,
  "artifacts/question-bank/review-candidate-question-bank.json",
);
const payload = toQuestionImportPayload(reviewCandidateQuestionBank);
const validation = validateQuestionImport(payload);

if (!validation.ok) {
  throw new Error(
    `題庫匯出前驗證失敗：${validation.errors
      .map((error) => `${error.id ?? error.index}:${error.path} ${error.message}`)
      .join("；")}`,
  );
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`已匯出 ${payload.length} 題：${outputPath}`);
