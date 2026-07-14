import { describe, expect, it, vi } from "vitest";
import { probeQuestionAssets } from "./question-asset-probe";

describe("question asset probe", () => {
  it("confirms a same-origin 404 as an unavailable image", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(
      probeQuestionAssets(
        [
          {
            id: "image-question",
            version: 2,
            modality: "image",
            audio: null,
            image: { src: "/assets/missing.webp", alt: "一個風箏" },
          },
        ],
        { fetcher, origin: "https://hero.example.edu" },
      ),
    ).resolves.toEqual([
      {
        questionId: "image-question",
        version: 2,
        kind: "image",
        status: "unavailable",
        detail: "HTTP 404",
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://hero.example.edu/assets/missing.webp",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("does not call a cross-origin asset broken when CORS prevents a reliable check", async () => {
    const fetcher = vi.fn();

    await expect(
      probeQuestionAssets(
        [
          {
            id: "remote-audio",
            version: 1,
            modality: "audio",
            audio: {
              src: "https://cdn.example.com/audio.mp3",
              transcript: "Open your book.",
            },
            image: null,
          },
        ],
        { fetcher, origin: "https://hero.example.edu" },
      ),
    ).resolves.toEqual([
      {
        questionId: "remote-audio",
        version: 1,
        kind: "audio",
        status: "unchecked",
        detail: "跨來源資產需由受信任的伺服器探測器檢查。",
      },
    ]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("treats a browser network failure as unchecked instead of a confirmed broken asset", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const [check] = await probeQuestionAssets(
      [
        {
          id: "audio-question",
          version: 3,
          modality: "audio",
          audio: { src: "/audio/item.mp3", transcript: "A pencil." },
          image: null,
        },
      ],
      { fetcher, origin: "https://hero.example.edu" },
    );

    expect(check).toEqual({
      questionId: "audio-question",
      version: 3,
      kind: "audio",
      status: "unchecked",
      detail: "瀏覽器無法確認資產狀態，未判定為破損。",
    });
  });
});
