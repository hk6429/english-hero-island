import type { ContentAssetCheck } from "@/domain/questions/content-quality";

export type QuestionAssetSubject = Readonly<{
  id: string;
  version: number;
  modality: "text" | "audio" | "image";
  audio: Readonly<{ src: string; transcript: string }> | null;
  image: Readonly<{ src: string; alt: string }> | null;
}>;

type AssetFetchResponse = Readonly<{ ok: boolean; status: number }>;
type AssetFetcher = (
  input: string,
  init: RequestInit,
) => Promise<AssetFetchResponse>;

export type QuestionAssetProbeOptions = Readonly<{
  origin: string;
  fetcher?: AssetFetcher;
  timeoutMs?: number;
}>;

export async function probeQuestionAssets(
  questions: ReadonlyArray<QuestionAssetSubject>,
  options: QuestionAssetProbeOptions,
): Promise<ReadonlyArray<ContentAssetCheck>> {
  const fetcher: AssetFetcher = options.fetcher ?? fetch;
  const checks = questions.flatMap((question) => {
    if (question.modality === "audio" && question.audio?.src.trim()) {
      return [
        probeAsset(
          question.id,
          question.version,
          "audio",
          question.audio.src,
          fetcher,
          options,
        ),
      ];
    }
    if (question.modality === "image" && question.image?.src.trim()) {
      return [
        probeAsset(
          question.id,
          question.version,
          "image",
          question.image.src,
          fetcher,
          options,
        ),
      ];
    }
    return [];
  });

  return Promise.all(checks);
}

async function probeAsset(
  questionId: string,
  version: number,
  kind: ContentAssetCheck["kind"],
  source: string,
  fetcher: AssetFetcher,
  options: QuestionAssetProbeOptions,
): Promise<ContentAssetCheck> {
  const base = new URL(options.origin);
  const normalizedSource = source.trim();
  if (normalizedSource.startsWith("data:") || normalizedSource.startsWith("tts:")) {
    return { questionId, version, kind, status: "available" };
  }

  let url: URL;
  try {
    url = new URL(normalizedSource, base);
  } catch {
    return {
      questionId,
      version,
      kind,
      status: "unchecked",
      detail: "資產網址格式無法由瀏覽器安全檢查。",
    };
  }

  if (url.origin !== base.origin) {
    return {
      questionId,
      version,
      kind,
      status: "unchecked",
      detail: "跨來源資產需由受信任的伺服器探測器檢查。",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  try {
    const response = await fetcher(url.toString(), {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (response.ok) {
      return { questionId, version, kind, status: "available" };
    }
    if (response.status === 404 || response.status === 410) {
      return {
        questionId,
        version,
        kind,
        status: "unavailable",
        detail: `HTTP ${response.status}`,
      };
    }
    return {
      questionId,
      version,
      kind,
      status: "unchecked",
      detail: `HTTP ${response.status} 可能是暫時狀態，未判定為破損。`,
    };
  } catch {
    return {
      questionId,
      version,
      kind,
      status: "unchecked",
      detail: "瀏覽器無法確認資產狀態，未判定為破損。",
    };
  } finally {
    clearTimeout(timeout);
  }
}
