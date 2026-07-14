import { describe, expect, it } from "vitest";
import type { Question } from "./question-schema";
import { auditContentQuality } from "./content-quality";

const validQuestion: Question = {
  id: "g3-quality-01",
  version: 1,
  status: "draft",
  grade: 3,
  skill: "phonics",
  indicator: "能辨識基礎 CVC 字詞",
  microSkill: "cvc-short-a",
  difficulty: 1,
  modality: "text",
  questionType: "multiple_choice",
  purpose: "diagnostic",
  prompt: "Which word is cat?",
  options: [
    { id: "a", text: "cat" },
    { id: "b", text: "cap" },
    { id: "c", text: "can" },
  ],
  correctOptionId: "a",
  explanation: "cat 的結尾音是 /t/。",
  hints: ["先看最後一個字母。"],
  variantGroup: "g3-cvc-short-a-cat",
  source: {
    kind: "original",
    note: "依 CVC 微技能原創",
    usageRights: "original-for-project",
  },
  author: { id: "hero-island-team", displayName: "英語英雄島團隊" },
  reviewers: [],
};

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return { ...validQuestion, ...overrides };
}

describe("content quality audit", () => {
  it("returns no issues for a valid draft without monitoring signals", () => {
    expect(auditContentQuality({ questions: [validQuestion] })).toEqual([]);
  });

  it("reports duplicate option identifiers as a blocking issue", () => {
    const question = makeQuestion({
      options: [
        { id: "a", text: "cat" },
        { id: "a", text: "cap" },
      ],
    });

    expect(auditContentQuality({ questions: [question] })).toEqual([
      {
        questionId: question.id,
        version: question.version,
        path: "options",
        severity: "error",
        code: "DUPLICATE_OPTION_ID",
        message: "選項識別碼不可重複。",
      },
    ]);
  });

  it("reports duplicate option text after case and whitespace normalization", () => {
    const question = makeQuestion({
      options: [
        { id: "a", text: "Cat" },
        { id: "b", text: "  cat  " },
      ],
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "options",
      severity: "error",
      code: "DUPLICATE_OPTION_TEXT",
      message: "正規化後的選項文字不可重複。",
    });
  });

  it("reports an answer key that is absent from the options", () => {
    const question = makeQuestion({ correctOptionId: "missing" });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "correctOptionId",
      severity: "error",
      code: "ANSWER_KEY_MISSING",
      message: "正解必須對應一個現有選項。",
    });
  });

  it("reports multiple explicit answer keys as a structural error", () => {
    const question = {
      ...validQuestion,
      correctOptionIds: ["a", "b"],
    } as Question & { correctOptionIds: string[] };

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "correctOptionIds",
      severity: "error",
      code: "MULTIPLE_EXPLICIT_ANSWER_KEYS",
      message: "資料中有多個明示答案鍵；仍需教師檢查語意上是否另有合理答案。",
    });
  });

  it("reports duplicate explicit answer keys separately", () => {
    const question = {
      ...validQuestion,
      correctOptionIds: ["a", "a"],
    } as Question & { correctOptionIds: string[] };

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "correctOptionIds",
      severity: "error",
      code: "DUPLICATE_EXPLICIT_ANSWER_KEYS",
      message: "資料中的明示答案鍵不可重複。",
    });
  });

  it("reports a missing audio asset for an audio question", () => {
    const question = makeQuestion({
      modality: "audio",
      questionType: "listening_choice",
      audio: undefined,
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "audio",
      severity: "error",
      code: "AUDIO_ASSET_MISSING",
      message: "聽力題缺少音訊資產。",
    });
  });

  it("reports a missing transcript when an audio asset exists", () => {
    const question = makeQuestion({
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "/audio/cat.mp3", transcript: "" },
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "audio.transcript",
      severity: "error",
      code: "AUDIO_TRANSCRIPT_MISSING",
      message: "聽力題缺少逐字稿。",
    });
  });

  it("warns when a verifiable TTS source text differs from its transcript", () => {
    const question = makeQuestion({
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: `tts:${encodeURIComponent("dog")}`, transcript: "cat" },
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "audio.transcript",
      severity: "warning",
      code: "AUDIO_TRANSCRIPT_MISMATCH_SUSPECTED",
      message: "TTS 來源文字與逐字稿不一致；請人工聆聽確認。",
    });
  });

  it("reports a missing image asset for an image question", () => {
    const question = makeQuestion({
      modality: "image",
      questionType: "image_choice",
      image: undefined,
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "image",
      severity: "error",
      code: "IMAGE_ASSET_MISSING",
      message: "圖片題缺少圖片資產。",
    });
  });

  it("reports missing alternative text when an image asset exists", () => {
    const question = makeQuestion({
      modality: "image",
      questionType: "image_choice",
      image: { src: "/images/cat.webp", alt: "  " },
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "image.alt",
      severity: "error",
      code: "IMAGE_ALT_MISSING",
      message: "圖片題缺少替代文字。",
    });
  });

  it("blocks an original question whose rights do not allow project publication", () => {
    const question = makeQuestion({
      source: {
        kind: "original",
        note: "作者尚未授權公開",
        usageRights: "draft-only",
      },
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "source.usageRights",
      severity: "error",
      code: "RIGHTS_NOT_PUBLISHABLE",
      message: "來源與授權狀態不允許發布。",
    });
  });

  it("warns about abnormally low accuracy only when the sample reaches the minimum", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      performance: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          attempts: 20,
          correct: 2,
        },
      ],
    });

    expect(issues).toContainEqual({
      questionId: validQuestion.id,
      version: validQuestion.version,
      path: "performance.accuracy",
      severity: "warning",
      code: "ACCURACY_ANOMALY_LOW",
      message: "答對率 10.0%（2/20）低於 20.0% 監測門檻。",
    });
  });

  it("does not report an accuracy anomaly when the sample is insufficient", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      performance: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          attempts: 19,
          correct: 0,
        },
      ],
    });

    expect(issues.filter((issue) => issue.code.startsWith("ACCURACY_ANOMALY"))).toEqual([]);
  });

  it("warns about suspiciously high accuracy with enough samples", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      performance: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          attempts: 20,
          correct: 20,
        },
      ],
    });

    expect(issues).toContainEqual({
      questionId: validQuestion.id,
      version: validQuestion.version,
      path: "performance.accuracy",
      severity: "warning",
      code: "ACCURACY_ANOMALY_HIGH",
      message: "答對率 100.0%（20/20）高於 95.0% 監測門檻。",
    });
  });

  it("blocks a question version with an unresolved dispute", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      disputes: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          status: "open",
        },
      ],
    });

    expect(issues).toContainEqual({
      questionId: validQuestion.id,
      version: validQuestion.version,
      path: "governance.dispute",
      severity: "error",
      code: "UNRESOLVED_DISPUTE",
      message: "此版本仍有未處理爭議，不可發布或重新投入作答。",
    });
  });

  it("sorts issues deterministically by severity, question, version, code, and path", () => {
    const warningQuestion = makeQuestion({ id: "question-z" });
    const errorQuestion = makeQuestion({
      id: "question-a",
      source: { kind: "research_reference", note: "僅供研究", usageRights: "research-only" },
    });

    const issues = auditContentQuality({
      questions: [warningQuestion, errorQuestion],
      performance: [
        {
          questionId: warningQuestion.id,
          version: warningQuestion.version,
          attempts: 20,
          correct: 1,
        },
      ],
    });

    expect(issues.map(({ severity, questionId, code }) => [severity, questionId, code])).toEqual([
      ["error", "question-a", "RIGHTS_NOT_PUBLISHABLE"],
      ["warning", "question-z", "ACCURACY_ANOMALY_LOW"],
    ]);
  });

  it("reports invalid performance counts instead of producing a false anomaly", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      performance: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          attempts: 20,
          correct: 21,
        },
      ],
    });

    expect(issues).toEqual([
      {
        questionId: validQuestion.id,
        version: validQuestion.version,
        path: "performance",
        severity: "error",
        code: "PERFORMANCE_DATA_INVALID",
        message: "作答統計必須是整數，且 0 ≤ correct ≤ attempts。",
      },
    ]);
  });

  it("reports multiple isCorrect option markers as structural answer keys", () => {
    const question = makeQuestion({
      options: [
        { id: "a", text: "cat", isCorrect: true },
        { id: "b", text: "cap", isCorrect: true },
      ] as unknown as Question["options"],
    });

    expect(auditContentQuality({ questions: [question] })).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "options",
      severity: "error",
      code: "MULTIPLE_EXPLICIT_ANSWER_KEYS",
      message: "選項中有多個 isCorrect=true 明示答案；仍需教師檢查語意合理性。",
    });
  });

  it("does not claim mismatch detection for matching TTS or opaque audio files", () => {
    const matchingTts = makeQuestion({
      id: "matching-tts",
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: `tts:${encodeURIComponent("Hello cat")}`, transcript: " hello   CAT " },
    });
    const opaqueAudio = makeQuestion({
      id: "opaque-audio",
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "/audio/unknown.mp3", transcript: "cat" },
    });

    const issues = auditContentQuality({ questions: [matchingTts, opaqueAudio] });

    expect(
      issues.filter((issue) => issue.code === "AUDIO_TRANSCRIPT_MISMATCH_SUSPECTED"),
    ).toEqual([]);
  });

  it("does not report a resolved dispute as unresolved", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      disputes: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          status: "resolved",
        },
      ],
    });

    expect(issues.filter((issue) => issue.code === "UNRESOLVED_DISPUTE")).toEqual([]);
  });

  it("treats the question disputed status as an unresolved dispute signal", () => {
    const question = makeQuestion({ status: "disputed" });

    expect(auditContentQuality({ questions: [question] })).toContainEqual(
      expect.objectContaining({
        questionId: question.id,
        version: question.version,
        severity: "error",
        code: "UNRESOLVED_DISPUTE",
      }),
    );
  });

  it("allows an explicit publication licence and blocks research-only material", () => {
    const licensed = makeQuestion({
      id: "licensed-question",
      source: {
        kind: "licensed",
        note: "已取得公開發布授權",
        usageRights: "licensed-for-publication",
      },
    });
    const researchOnly = makeQuestion({
      id: "research-question",
      source: {
        kind: "research_reference",
        note: "僅作命題研究",
        usageRights: "research-only",
      },
    });

    const rightsIssues = auditContentQuality({ questions: [licensed, researchOnly] }).filter(
      (issue) => issue.code === "RIGHTS_NOT_PUBLISHABLE",
    );

    expect(rightsIssues).toHaveLength(1);
    expect(rightsIssues[0]?.questionId).toBe(researchOnly.id);
  });

  it("honours an explicit minimum-sample policy", () => {
    const issues = auditContentQuality({
      questions: [validQuestion],
      performance: [
        {
          questionId: validQuestion.id,
          version: validQuestion.version,
          attempts: 5,
          correct: 0,
        },
      ],
      policy: { minimumAccuracySampleSize: 5 },
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        questionId: validQuestion.id,
        code: "ACCURACY_ANOMALY_LOW",
      }),
    );
  });

  it("rejects an invalid monitoring policy instead of misclassifying questions", () => {
    expect(() =>
      auditContentQuality({
        questions: [validQuestion],
        policy: {
          minimumAccuracySampleSize: 0,
          lowAccuracyThreshold: 0.9,
          highAccuracyThreshold: 0.8,
        },
      }),
    ).toThrow("品質監測門檻設定無效");
  });

  it("reports an audio asset as unreachable only from an explicit unavailable check", () => {
    const question = makeQuestion({
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "/audio/broken.mp3", transcript: "cat" },
    });

    expect(
      auditContentQuality({
        questions: [question],
        assetChecks: [
          {
            questionId: question.id,
            version: question.version,
            kind: "audio",
            status: "unavailable",
            detail: "HTTP 404",
          },
        ],
      }),
    ).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "audio.src",
      severity: "error",
      code: "AUDIO_ASSET_UNREACHABLE",
      message: "外部資產檢查確認音訊無法存取。",
      detail: "HTTP 404",
    });
  });

  it("reports an image asset as unreachable from an explicit unavailable check", () => {
    const question = makeQuestion({
      modality: "image",
      questionType: "image_choice",
      image: { src: "/images/broken.webp", alt: "一隻貓" },
    });

    expect(
      auditContentQuality({
        questions: [question],
        assetChecks: [
          {
            questionId: question.id,
            version: question.version,
            kind: "image",
            status: "unavailable",
          },
        ],
      }),
    ).toContainEqual({
      questionId: question.id,
      version: question.version,
      path: "image.src",
      severity: "error",
      code: "IMAGE_ASSET_UNREACHABLE",
      message: "外部資產檢查確認圖片無法存取。",
    });
  });

  it("does not call unchecked or available assets broken", () => {
    const audioQuestion = makeQuestion({
      id: "audio-unchecked",
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "/audio/cat.mp3", transcript: "cat" },
    });
    const imageQuestion = makeQuestion({
      id: "image-available",
      modality: "image",
      questionType: "image_choice",
      image: { src: "/images/cat.webp", alt: "一隻貓" },
    });

    const issues = auditContentQuality({
      questions: [audioQuestion, imageQuestion],
      assetChecks: [
        {
          questionId: audioQuestion.id,
          version: audioQuestion.version,
          kind: "audio",
          status: "unchecked",
          detail: "尚未執行探測",
        },
        {
          questionId: imageQuestion.id,
          version: imageQuestion.version,
          kind: "image",
          status: "available",
        },
      ],
    });

    expect(issues.filter((issue) => issue.code.endsWith("ASSET_UNREACHABLE"))).toEqual([]);
  });

  it("keeps unreachable-asset issues in the same deterministic ordering", () => {
    const audioQuestion = makeQuestion({
      id: "question-z-audio",
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "/audio/broken.mp3", transcript: "cat" },
    });
    const imageQuestion = makeQuestion({
      id: "question-a-image",
      modality: "image",
      questionType: "image_choice",
      image: { src: "/images/broken.webp", alt: "一隻貓" },
    });

    const issues = auditContentQuality({
      questions: [audioQuestion, imageQuestion],
      assetChecks: [
        {
          questionId: audioQuestion.id,
          version: audioQuestion.version,
          kind: "audio",
          status: "unavailable",
        },
        {
          questionId: imageQuestion.id,
          version: imageQuestion.version,
          kind: "image",
          status: "unavailable",
        },
      ],
    }).filter((issue) => issue.code.endsWith("ASSET_UNREACHABLE"));

    expect(issues.map(({ questionId, code }) => [questionId, code])).toEqual([
      ["question-a-image", "IMAGE_ASSET_UNREACHABLE"],
      ["question-z-audio", "AUDIO_ASSET_UNREACHABLE"],
    ]);
  });
});
