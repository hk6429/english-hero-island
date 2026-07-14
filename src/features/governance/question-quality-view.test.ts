import { describe, expect, it } from "vitest";
import type {
  QuestionBankItem,
  QuestionQualitySignal,
} from "@/infrastructure/supabase/question-management-gateway";
import { buildQuestionQualityView } from "./question-quality-view";

function question(
  overrides: Partial<QuestionBankItem> = {},
): QuestionBankItem {
  return {
    id: "g3-vocabulary-001",
    version: 2,
    status: "draft",
    grade: 3,
    skill: "vocabulary",
    indicator: "能辨識常用字詞",
    microSkill: "school_objects",
    difficulty: 1,
    modality: "text",
    questionType: "multiple_choice",
    purpose: "practice",
    prompt: "Which one is a book?",
    audio: null,
    image: null,
    options: [
      { id: "A", text: "book" },
      { id: "B", text: "book" },
    ],
    correctOptionId: "A",
    explanation: "Book 是書本。",
    hints: ["想想課堂上會閱讀的物品。"],
    variantGroup: "school-objects",
    source: {
      kind: "original",
      note: "專案原創",
      usageRights: "original-for-project",
    },
    author: { id: "editor-1", displayName: "內容編輯" },
    createdBy: null,
    supersedesVersion: 1,
    changeSummary: "修正選項文字",
    lockedAt: null,
    reviewedAt: null,
    publishedAt: null,
    createdAt: "2026-07-14T01:00:00.000Z",
    approvalCount: 0,
    changeRequestCount: 0,
    ...overrides,
  };
}

function signal(
  overrides: Partial<QuestionQualitySignal> = {},
): QuestionQualitySignal {
  return {
    questionId: "g3-vocabulary-001",
    version: 2,
    status: "published",
    grade: 3,
    microSkill: "school_objects",
    modality: "text",
    prompt: "Which one is a book?",
    responseCount: 20,
    independentCorrectCount: 18,
    assistedCorrectCount: 2,
    rescuedCount: 0,
    pendingSupportCount: 0,
    isDisputed: false,
    ...overrides,
  };
}

describe("buildQuestionQualityView", () => {
  it("turns an auditable content error into a blocking finding without claiming semantic ambiguity", () => {
    const view = buildQuestionQualityView([question()], []);

    expect(view.findings).toContainEqual({
      id: "g3-vocabulary-001-v2-DUPLICATE_OPTION_TEXT-options",
      questionId: "g3-vocabulary-001",
      questionVersion: 2,
      severity: "blocking",
      title: "選項文字重複",
      description: "請由內容編輯或英語教師確認並修正後，再進入發布流程。",
      evidence:
        "題號 g3-vocabulary-001／版本 2：正規化後的選項文字不可重複。",
    });
    expect(view.findings.map((finding) => finding.title).join(" ")).not.toContain(
      "多個合理答案",
    );
  });

  it("uses response count as attempts and both correct outcome counts for accuracy auditing", () => {
    const view = buildQuestionQualityView(
      [
        question({
          options: [
            { id: "A", text: "book" },
            { id: "B", text: "desk" },
          ],
        }),
      ],
      [signal()],
    );

    expect(view.findings).toContainEqual({
      id: "g3-vocabulary-001-v2-ACCURACY_ANOMALY_HIGH-performance.accuracy",
      questionId: "g3-vocabulary-001",
      questionVersion: 2,
      severity: "warning",
      title: "答對率異常偏高",
      description: "請由內容編輯或英語教師確認此品質訊號。",
      evidence:
        "題號 g3-vocabulary-001／版本 2：答對率 100.0%（20/20）高於 95.0% 監測門檻。",
    });
  });

  it("turns a disputed quality signal into an open blocking dispute", () => {
    const view = buildQuestionQualityView(
      [
        question({
          options: [
            { id: "A", text: "book" },
            { id: "B", text: "desk" },
          ],
        }),
      ],
      [
        signal({
          independentCorrectCount: 10,
          assistedCorrectCount: 5,
          isDisputed: true,
        }),
      ],
    );

    expect(view.findings).toContainEqual({
      id: "g3-vocabulary-001-v2-UNRESOLVED_DISPUTE-governance.dispute",
      questionId: "g3-vocabulary-001",
      questionVersion: 2,
      severity: "blocking",
      title: "題目爭議尚未結案",
      description: "請由內容編輯或英語教師確認並修正後，再進入發布流程。",
      evidence:
        "題號 g3-vocabulary-001／版本 2：此版本仍有未處理爭議，不可發布或重新投入作答。",
    });
  });

  it("marks the view insufficient when a question has fewer samples than the default policy requires", () => {
    const view = buildQuestionQualityView(
      [
        question({
          options: [
            { id: "A", text: "book" },
            { id: "B", text: "desk" },
          ],
        }),
      ],
      [signal({ responseCount: 19, independentCorrectCount: 10, assistedCorrectCount: 5 })],
    );

    expect(view.dataState).toEqual({
      state: "insufficient",
      message:
        "1 個題目版本尚未達每題至少 20 份作答的監測門檻；現階段不能判定沒有品質問題。",
    });
  });

  it("marks the view sufficient only when every question reaches the default sample threshold", () => {
    const view = buildQuestionQualityView(
      [
        question({
          options: [
            { id: "A", text: "book" },
            { id: "B", text: "desk" },
          ],
        }),
      ],
      [signal({ independentCorrectCount: 10, assistedCorrectCount: 5 })],
    );

    expect(view.dataState).toEqual({
      state: "sufficient",
      message:
        "1 個題目版本皆已達每題至少 20 份作答的監測門檻；仍須依品質訊號進行人工判讀。",
    });
  });

  it("labels multiple explicit answer flags without claiming semantic multiple-answer detection", () => {
    const options = [
      { id: "A", text: "book", isCorrect: true },
      { id: "B", text: "desk", isCorrect: true },
    ];

    const view = buildQuestionQualityView([question({ options })], []);

    expect(view.findings).toContainEqual({
      id: "g3-vocabulary-001-v2-MULTIPLE_EXPLICIT_ANSWER_KEYS-options",
      questionId: "g3-vocabulary-001",
      questionVersion: 2,
      severity: "blocking",
      title: "資料中有多個明示答案鍵",
      description: "請由內容編輯或英語教師確認並修正後，再進入發布流程。",
      evidence:
        "題號 g3-vocabulary-001／版本 2：選項中有多個 isCorrect=true 明示答案；仍需教師檢查語意合理性。",
    });
    expect(view.findings.map((finding) => finding.title).join(" ")).not.toContain(
      "多個合理答案",
    );
  });

  it("gives distinct readable titles to common blocking audit findings", () => {
    const view = buildQuestionQualityView(
      [
        question({
          options: [
            { id: "A", text: "book" },
            { id: "A", text: "book" },
          ],
          correctOptionId: "C",
          source: {
            kind: "research_reference",
            note: "僅供研究參考",
            usageRights: "reference-only",
          },
        }),
      ],
      [],
    );

    expect(view.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        "正解未對應現有選項",
        "選項識別碼重複",
        "選項文字重複",
        "來源授權不允許發布",
      ]),
    );
    expect(view.findings.map((finding) => finding.title)).not.toContain(
      "題目內容需要檢查",
    );
  });

  it("keeps an empty result safely insufficient", () => {
    expect(buildQuestionQualityView([], []).dataState).toEqual({
      state: "insufficient",
      message: "目前沒有可稽核的題目版本；不能判定沒有品質問題。",
    });
  });

  it("shows a blocking finding only when an external asset check confirms failure", () => {
    const checkedQuestion = question({
      modality: "image",
      questionType: "image_choice",
      image: { src: "/assets/missing.webp", alt: "一個書包" },
      options: [
        { id: "A", text: "book" },
        { id: "B", text: "desk" },
      ],
    });

    const view = buildQuestionQualityView([checkedQuestion], [], [
      {
        questionId: checkedQuestion.id,
        version: checkedQuestion.version,
        kind: "image",
        status: "unavailable",
        detail: "HTTP 404",
      },
    ]);

    expect(view.findings).toContainEqual({
      id: "g3-vocabulary-001-v2-IMAGE_ASSET_UNREACHABLE-image.src",
      questionId: "g3-vocabulary-001",
      questionVersion: 2,
      severity: "blocking",
      title: "圖片資產無法存取",
      description: "請由內容編輯或英語教師確認並修正後，再進入發布流程。",
      evidence: "題號 g3-vocabulary-001／版本 2：外部資產檢查確認圖片無法存取。",
    });
    expect(view.assetDataState).toEqual({
      state: "sufficient",
      message: "1 個音訊或圖片資產已有自動檢查結果；無法存取的項目仍會阻擋發布。",
    });
  });

  it("states that unchecked cross-origin assets still require human verification", () => {
    const uncheckedQuestion = question({
      modality: "audio",
      questionType: "listening_choice",
      audio: { src: "https://media.example.org/cat.mp3", transcript: "cat" },
    });

    const view = buildQuestionQualityView([uncheckedQuestion], [], [
      {
        questionId: uncheckedQuestion.id,
        version: uncheckedQuestion.version,
        kind: "audio",
        status: "unchecked",
        detail: "跨來源資產須由真人確認",
      },
    ]);

    expect(view.assetDataState).toEqual({
      state: "insufficient",
      message: "1 個音訊或圖片資產尚未由自動檢查確認；發布前必須由真人開啟並核對。",
    });
  });
});
