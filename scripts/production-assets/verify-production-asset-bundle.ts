import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { z } from "zod";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const sourceKindSchema = z.enum(["original", "licensed"]);
const usageRightsSchema = z.enum([
  "original-for-project",
  "licensed-for-publication",
]);
const assetKindSchema = z.enum(["audio", "image"]);
const mimeTypeSchema = z.enum([
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const questionSchema = z
  .object({
    id: z.string().min(1),
    modality: z.enum(["text", "audio", "image"]),
    audio: z
      .object({
        src: z.string().min(1),
      })
      .passthrough()
      .optional(),
    image: z
      .object({
        src: z.string().min(1),
      })
      .passthrough()
      .optional(),
    source: z
      .object({
        kind: z.enum(["original", "licensed", "research_reference"]),
        usageRights: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  evidenceClass: z.literal("production_question_asset_bundle"),
  questionBankSha256: sha256Schema,
  assets: z.array(
    z.object({
      questionId: z.string().min(1),
      assetKind: assetKindSchema,
      replacesPlaceholder: z.string().min(1),
      publicLocator: z.string().startsWith("/assets/question-assets/"),
      sha256: sha256Schema,
      byteLength: z.number().int().positive(),
      mimeType: mimeTypeSchema,
      rightsEvidence: z.object({
        sourceKind: sourceKindSchema,
        usageRights: usageRightsSchema,
        documentPath: z.string().min(1),
        sha256: sha256Schema,
        byteLength: z.number().int().positive(),
      }),
    }),
  ),
});

type QuestionRecord = z.infer<typeof questionSchema>;
type Manifest = z.infer<typeof manifestSchema>;
type ManifestAsset = Manifest["assets"][number];

export type ProductionAssetBundleIssue = Readonly<{
  code: string;
  message: string;
  questionId?: string;
  assetKind?: "audio" | "image";
}>;

export class ProductionAssetBundleError extends Error {
  readonly issues: readonly ProductionAssetBundleIssue[];

  constructor(issues: readonly ProductionAssetBundleIssue[]) {
    super(issues.map(({ message }) => message).join("\n"));
    this.name = "ProductionAssetBundleError";
    this.issues = issues;
  }
}

export type VerifiedProductionAssetBundle = Readonly<{
  summary: Readonly<{
    status: "ready";
    questionCount: number;
    verifiedAssetCount: number;
    audioAssetCount: number;
    imageAssetCount: number;
    questionBankSha256: string;
    manifestSha256: string;
  }>;
  productionQuestionBank: readonly Readonly<Record<string, unknown>>[];
}>;

export async function verifyProductionAssetBundle(input: {
  questionBankBytes: Uint8Array;
  manifestBytes: Uint8Array;
  publicRoot: string;
  rightsRoot: string;
}): Promise<VerifiedProductionAssetBundle> {
  const questionBankSha256 = sha256(input.questionBankBytes);
  const manifestSha256 = sha256(input.manifestBytes);
  const questions = parseJson(questionSchema.array(), input.questionBankBytes, "題庫");
  const manifest = parseJson(manifestSchema, input.manifestBytes, "正式素材 manifest");

  if (manifest.questionBankSha256 !== questionBankSha256) {
    throw new ProductionAssetBundleError([
      {
        code: "QUESTION_BANK_HASH_MISMATCH",
        message: "正式素材 manifest 綁定的題庫 SHA-256 與實際題庫不一致。",
      },
    ]);
  }

  const seenQuestionIds = new Set<string>();
  const duplicateQuestionIds = new Set<string>();
  for (const question of questions) {
    if (seenQuestionIds.has(question.id)) duplicateQuestionIds.add(question.id);
    seenQuestionIds.add(question.id);
  }
  if (duplicateQuestionIds.size > 0) {
    throw new ProductionAssetBundleError(
      [...duplicateQuestionIds].sort().map((questionId) => ({
        code: "DUPLICATE_QUESTION_ID",
        questionId,
        message: `題庫中的 ${questionId} 識別碼重複，不能建立正式素材綁定。`,
      })),
    );
  }

  const assetsByQuestionAndKind = new Map<string, ManifestAsset>();
  const receiptsByPublicLocator = new Map<string, string>();
  for (const asset of manifest.assets) {
    const key = assetKey(asset.questionId, asset.assetKind);
    if (assetsByQuestionAndKind.has(key)) {
      throw new ProductionAssetBundleError([
        {
          code: "DUPLICATE_QUESTION_ASSET",
          questionId: asset.questionId,
          message: `${asset.questionId} 的 ${asset.assetKind} 素材證據不可重複。`,
        },
      ]);
    }
    const receiptFingerprint = [
      asset.assetKind,
      asset.sha256,
      asset.byteLength,
      asset.mimeType,
    ].join(":");
    const priorReceipt = receiptsByPublicLocator.get(asset.publicLocator);
    if (priorReceipt !== undefined && priorReceipt !== receiptFingerprint) {
      throw new ProductionAssetBundleError([
        {
          code: "ASSET_LOCATOR_CONFLICT",
          questionId: asset.questionId,
          message: `${asset.questionId} 的公開素材位置已對應另一份不同的 byte receipt。`,
        },
      ]);
    }
    receiptsByPublicLocator.set(asset.publicLocator, receiptFingerprint);
    assetsByQuestionAndKind.set(key, asset);
  }

  const missingAssetIssues = questions.flatMap<ProductionAssetBundleIssue>((question) => {
    const requiredKind = question.modality === "text" ? null : question.modality;
    if (
      requiredKind === null ||
      assetsByQuestionAndKind.has(assetKey(question.id, requiredKind))
    ) {
      return [];
    }
    return [
      {
        code: "ASSET_EVIDENCE_MISSING",
        questionId: question.id,
        assetKind: requiredKind,
        message: `${question.id} 缺少 ${requiredKind} 正式素材證據。`,
      },
    ];
  });
  if (missingAssetIssues.length > 0) {
    throw new ProductionAssetBundleError(missingAssetIssues);
  }

  const usedAssets = new Set<ManifestAsset>();
  const productionQuestionBank: Readonly<Record<string, unknown>>[] = [];

  for (const question of questions) {
    const requiredKind = question.modality === "text" ? null : question.modality;
    if (requiredKind === null) {
      productionQuestionBank.push(question);
      continue;
    }

    const asset = assetsByQuestionAndKind.get(assetKey(question.id, requiredKind));
    if (!asset) {
      throw new ProductionAssetBundleError([
        {
          code: "ASSET_EVIDENCE_MISSING",
          questionId: question.id,
          assetKind: requiredKind,
          message: `${question.id} 缺少 ${requiredKind} 正式素材證據。`,
        },
      ]);
    }

    await verifyAssetReceipt(asset, question, input.publicRoot, input.rightsRoot);
    usedAssets.add(asset);
    productionQuestionBank.push(replaceQuestionAsset(question, asset));
  }

  if (usedAssets.size !== manifest.assets.length) {
    throw new ProductionAssetBundleError([
      {
        code: "UNUSED_ASSET_EVIDENCE",
        message: "正式素材 manifest 含有無法對應題庫的素材證據。",
      },
    ]);
  }

  return {
    summary: {
      status: "ready",
      questionCount: questions.length,
      verifiedAssetCount: manifest.assets.length,
      audioAssetCount: manifest.assets.filter(({ assetKind }) => assetKind === "audio").length,
      imageAssetCount: manifest.assets.filter(({ assetKind }) => assetKind === "image").length,
      questionBankSha256,
      manifestSha256,
    },
    productionQuestionBank,
  };
}

async function verifyAssetReceipt(
  asset: ManifestAsset,
  question: QuestionRecord,
  publicRoot: string,
  rightsRoot: string,
): Promise<void> {
  const questionAsset = asset.assetKind === "audio" ? question.audio : question.image;
  if (!questionAsset || questionAsset.src !== asset.replacesPlaceholder) {
    throw new ProductionAssetBundleError([
      {
        code: "PLACEHOLDER_MISMATCH",
        questionId: question.id,
        message: `${question.id} 的待替換素材與 manifest 不一致。`,
      },
    ]);
  }

  assertRightsCombination(asset, question.id);
  assertContentAddressedAssetLocator(asset, question.id);
  assertContentAddressedRightsPath(asset, question.id);

  const assetBytes = await readRequiredFile(
    resolveUnderRoot(publicRoot, asset.publicLocator.slice(1)),
    "ASSET",
    question.id,
  );
  assertByteReceipt(
    assetBytes,
    asset.sha256,
    asset.byteLength,
    "ASSET",
    question.id,
  );
  const detectedMimeType = detectMimeType(assetBytes);
  if (detectedMimeType !== asset.mimeType || !mimeMatchesKind(asset.mimeType, asset.assetKind)) {
    throw new ProductionAssetBundleError([
      {
        code: "ASSET_MIME_MISMATCH",
        questionId: question.id,
        message: `${question.id} 的素材 MIME 與實際檔頭或素材種類不一致。`,
      },
    ]);
  }

  const rightsBytes = await readRequiredFile(
    resolveUnderRoot(rightsRoot, asset.rightsEvidence.documentPath),
    "RIGHTS_EVIDENCE",
    question.id,
  );
  assertByteReceipt(
    rightsBytes,
    asset.rightsEvidence.sha256,
    asset.rightsEvidence.byteLength,
    "RIGHTS_EVIDENCE",
    question.id,
  );
}

function replaceQuestionAsset(
  question: QuestionRecord,
  asset: ManifestAsset,
): Readonly<Record<string, unknown>> {
  if (asset.assetKind === "audio" && question.audio) {
    return {
      ...question,
      audio: { ...question.audio, src: asset.publicLocator },
    };
  }
  if (asset.assetKind === "image" && question.image) {
    return {
      ...question,
      image: { ...question.image, src: asset.publicLocator },
    };
  }
  return question;
}

function assertRightsCombination(asset: ManifestAsset, questionId: string): void {
  const allowed =
    (asset.rightsEvidence.sourceKind === "original" &&
      asset.rightsEvidence.usageRights === "original-for-project") ||
    (asset.rightsEvidence.sourceKind === "licensed" &&
      asset.rightsEvidence.usageRights === "licensed-for-publication");
  if (!allowed) {
    throw new ProductionAssetBundleError([
      {
        code: "RIGHTS_NOT_PUBLISHABLE",
        questionId,
        message: `${questionId} 的素材權利不足以公開發布。`,
      },
    ]);
  }
}

function assertContentAddressedAssetLocator(asset: ManifestAsset, questionId: string): void {
  const expectedExtension = extensionForMime(asset.mimeType);
  if (
    asset.publicLocator !==
    `/assets/question-assets/${asset.sha256}${expectedExtension}`
  ) {
    throw new ProductionAssetBundleError([
      {
        code: "ASSET_LOCATOR_NOT_IMMUTABLE",
        questionId,
        message: `${questionId} 的公開素材位置必須以檔案 SHA-256 命名。`,
      },
    ]);
  }
}

function assertContentAddressedRightsPath(asset: ManifestAsset, questionId: string): void {
  const extension = extname(asset.rightsEvidence.documentPath).toLowerCase();
  if (
    ![".md", ".txt", ".pdf"].includes(extension) ||
    basename(asset.rightsEvidence.documentPath) !==
      `${asset.rightsEvidence.sha256}${extension}`
  ) {
    throw new ProductionAssetBundleError([
      {
        code: "RIGHTS_LOCATOR_NOT_IMMUTABLE",
        questionId,
        message: `${questionId} 的權利文件位置必須以文件 SHA-256 命名。`,
      },
    ]);
  }
}

function assertByteReceipt(
  bytes: Uint8Array,
  expectedSha256: string,
  expectedByteLength: number,
  prefix: "ASSET" | "RIGHTS_EVIDENCE",
  questionId: string,
): void {
  if (bytes.byteLength !== expectedByteLength) {
    throw new ProductionAssetBundleError([
      {
        code: `${prefix}_BYTE_LENGTH_MISMATCH`,
        questionId,
        message: `${questionId} 的檔案長度與 manifest 不一致。`,
      },
    ]);
  }
  if (sha256(bytes) !== expectedSha256) {
    throw new ProductionAssetBundleError([
      {
        code: `${prefix}_HASH_MISMATCH`,
        questionId,
        message: `${questionId} 的檔案 SHA-256 與 manifest 不一致。`,
      },
    ]);
  }
}

async function readRequiredFile(
  path: string,
  prefix: "ASSET" | "RIGHTS_EVIDENCE",
  questionId: string,
): Promise<Uint8Array> {
  try {
    return await readFile(path);
  } catch (error) {
    const missing = isErrorCode(error, "ENOENT");
    if (!missing) throw error;
    throw new ProductionAssetBundleError([
      {
        code: `${prefix}_FILE_MISSING`,
        questionId,
        message: `${questionId} 的${prefix === "ASSET" ? "正式素材" : "權利證明"}檔案不存在。`,
      },
    ]);
  }
}

function detectMimeType(bytes: Uint8Array): z.infer<typeof mimeTypeSchema> | null {
  if (startsWith(bytes, [0x49, 0x44, 0x33]) || isMpegFrame(bytes)) return "audio/mpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return "audio/wav";
  if (ascii(bytes, 0, 4) === "OggS") return "audio/ogg";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  return null;
}

function isMpegFrame(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

function isErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function mimeMatchesKind(
  mimeType: z.infer<typeof mimeTypeSchema>,
  kind: z.infer<typeof assetKindSchema>,
): boolean {
  return mimeType.startsWith(`${kind}/`);
}

function extensionForMime(mimeType: z.infer<typeof mimeTypeSchema>): string {
  return {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  }[mimeType];
}

function resolveUnderRoot(root: string, relativePath: string): string {
  const normalizedRoot = resolve(root);
  const target = resolve(normalizedRoot, relativePath);
  if (target !== normalizedRoot && !target.startsWith(`${normalizedRoot}${sep}`)) {
    throw new ProductionAssetBundleError([
      {
        code: "PATH_OUTSIDE_ROOT",
        message: "正式素材 manifest 含有超出允許根目錄的路徑。",
      },
    ]);
  }
  return target;
}

function parseJson<T>(
  schema: z.ZodType<T>,
  bytes: Uint8Array,
  label: string,
): T {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return schema.parse(JSON.parse(text));
  } catch {
    throw new ProductionAssetBundleError([
      {
        code: "INVALID_JSON_CONTRACT",
        message: `${label}不是符合正式素材契約的 UTF-8 JSON。`,
      },
    ]);
  }
}

function assetKey(questionId: string, kind: z.infer<typeof assetKindSchema>): string {
  return `${questionId}\u0000${kind}`;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
