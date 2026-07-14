import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { buildDraftPrereviewPack } from "./teacher-prereview-pack/build-draft-prereview-pack";
import { renderDraftPrereviewPackFiles } from "./teacher-prereview-pack/render-draft-prereview-pack-files";

const sourcePath = resolve(
  process.cwd(),
  "artifacts/question-bank/review-candidate-question-bank.json",
);
const sourceBytes = await readFile(sourcePath);
const pack = buildDraftPrereviewPack(sourceBytes);
const files = renderDraftPrereviewPackFiles(pack, new Date().toISOString());
const manifest = JSON.parse(files.get("manifest.json") ?? "null") as { packId?: unknown };

if (typeof manifest.packId !== "string") {
  throw new Error("草稿預審包缺少可用的 packId。");
}

const outputDirectory = resolve(
  process.cwd(),
  "artifacts/teacher-prereview-pack",
  manifest.packId,
);
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  [...files].map(([fileName, content]) =>
    writeFile(join(outputDirectory, fileName), content, "utf8"),
  ),
);

console.log(`Teacher draft prereview pack written to ${outputDirectory}`);
