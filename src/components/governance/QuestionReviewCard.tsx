"use client";

import { CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

export const reviewCriteriaKeys = [
  "english_correct",
  "answer_unique",
  "explanation_correct",
  "hint_safe",
  "asset_consistent",
  "rights_clear",
  "age_appropriate",
] as const;

export type ReviewCriterion = (typeof reviewCriteriaKeys)[number];
export type ReviewCriteria = Readonly<Record<ReviewCriterion, boolean>>;

export type QuestionReviewQueueItem = Readonly<{
  id: string;
  version: number;
  grade: 3 | 4 | 5 | 6;
  microSkill: string;
  modality: "text" | "audio" | "image";
  prompt: string;
  audio: Readonly<{ src: string; transcript: string }> | null;
  image: Readonly<{ src: string; alt: string }> | null;
  options: ReadonlyArray<Readonly<{ id: string; text: string }>>;
  correctOptionId: string;
  explanation: string;
  hints: ReadonlyArray<string>;
  source: Readonly<{
    kind: "original" | "licensed" | "research_reference";
    url?: string;
    note: string;
    usageRights: string;
  }>;
  authorName: string;
  changeSummary: string | null;
  contentSha256: string;
  contentHashSchema: "question-review-snapshot-pg-jsonb-text-v1";
  lockedAt: string;
}>;

export type QuestionReviewSubmission = Readonly<{
  questionId: string;
  questionVersion: number;
  expectedContentSha256: string;
  expectedContentHashSchema: "question-review-snapshot-pg-jsonb-text-v1";
  verdict: "approved" | "changes_requested";
  note: string;
  criteria: ReviewCriteria;
}>;

type Props = Readonly<{
  item: QuestionReviewQueueItem;
  onSubmit: (submission: QuestionReviewSubmission) => Promise<void>;
}>;

const criteriaLabels: Readonly<Record<ReviewCriterion, string>> = {
  english_correct: "英文內容正確",
  answer_unique: "只有一個合理正解",
  explanation_correct: "解析正確且學生看得懂",
  hint_safe: "提示能協助思考且不直接洩題",
  asset_consistent: "音訊、圖片與文字內容一致",
  rights_clear: "來源與授權可供本專案發布",
  age_appropriate: "情境與用語適合這個年級",
};

const emptyCriteria = Object.fromEntries(
  reviewCriteriaKeys.map((criterion) => [criterion, false]),
) as Record<ReviewCriterion, boolean>;

function ttsText(src: string) {
  if (!src.startsWith("tts:")) return null;
  try {
    return decodeURIComponent(src.slice(4));
  } catch {
    return src.slice(4);
  }
}

function playTts(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function formatLockedAt(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export function QuestionReviewCard({ item, onSubmit }: Props) {
  const [criteria, setCriteria] = useState<Record<ReviewCriterion, boolean>>({
    ...emptyCriteria,
  });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<
    QuestionReviewSubmission["verdict"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const correctOption = useMemo(
    () => item.options.find((option) => option.id === item.correctOptionId),
    [item.correctOptionId, item.options],
  );
  const hasMeaningfulNote = note.trim().length >= 4;
  const allCriteriaPassed = reviewCriteriaKeys.every(
    (criterion) => criteria[criterion],
  );
  const hasFailedCriteria = reviewCriteriaKeys.some(
    (criterion) => !criteria[criterion],
  );
  const audioTtsText = item.audio ? ttsText(item.audio.src) : null;

  function requestSubmit(verdict: QuestionReviewSubmission["verdict"]) {
    if (
      !hasMeaningfulNote ||
      (verdict === "approved" && !allCriteriaPassed) ||
      (verdict === "changes_requested" && !hasFailedCriteria)
    ) {
      return;
    }
    setPendingVerdict(verdict);
    setError(null);
  }

  async function confirmSubmit() {
    if (!pendingVerdict) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        questionId: item.id,
        questionVersion: item.version,
        expectedContentSha256: item.contentSha256,
        expectedContentHashSchema: item.contentHashSchema,
        verdict: pendingVerdict,
        note: note.trim(),
        criteria: { ...criteria },
      });
      setPendingVerdict(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "複核送出失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="question-review-card" aria-labelledby={`review-${item.id}`}>
      <header className="question-review-heading">
        <div>
          <p className="eyebrow">
            四眼複核・{item.grade} 年級・{item.microSkill}
          </p>
          <h2 id={`review-${item.id}`}>{item.prompt}</h2>
          <p className="question-review-meta">
            <span>{`題號 ${item.id}`}</span>
            <span>{`第 ${item.version} 版`}</span>
            <span>{`作者 ${item.authorName}`}</span>
            <time dateTime={item.lockedAt}>{`凍結時間 ${formatLockedAt(item.lockedAt)}`}</time>
          </p>
        </div>
        <div className="review-count" role="group" aria-label="複核進度">
          <ShieldCheck aria-hidden="true" />
          <strong>獨立複核中：送出前不顯示其他教師的判斷</strong>
        </div>
      </header>

      {item.changeSummary ? (
        <p className="question-change-summary">
          <RotateCcw aria-hidden="true" />
          <span>本版修改：</span>
          <strong>{item.changeSummary}</strong>
        </p>
      ) : null}

      <section
        aria-label="凍結內容確認收據"
        className="question-review-receipt"
      >
        <h3>凍結內容確認收據</h3>
        <p>
          下列 SHA-256 對應目前凍結題目快照。它是內容確認依據，不是數位簽章，也不代表音訊或圖片檔案已完成位元組驗證。
        </p>
        <p>
          <strong>SHA-256</strong>
          <code>{item.contentSha256}</code>
        </p>
        <p>
          <strong>雜湊規格</strong>
          <code>{item.contentHashSchema}</code>
        </p>
      </section>

      <section className="question-review-evidence" aria-label="題目內容證據">
        {item.audio || item.image ? (
          <div className="question-review-assets">
            <h3>音訊與圖片</h3>
            {item.audio ? (
              <div>
                {audioTtsText ? (
                  <button
                    className="secondary-button"
                    onClick={() => playTts(audioTtsText)}
                    type="button"
                  >
                    播放合成語音
                  </button>
                ) : (
                  <audio
                    aria-label="播放題目音訊"
                    controls
                    preload="none"
                    src={item.audio.src}
                  />
                )}
                <p>{`逐字稿：${item.audio.transcript}`}</p>
              </div>
            ) : null}
            {item.image ? (
              <figure>
                {/* Content reviewers must inspect arbitrary governed asset URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={item.image.alt} loading="lazy" src={item.image.src} />
                <figcaption>{`替代文字：${item.image.alt}`}</figcaption>
              </figure>
            ) : null}
          </div>
        ) : null}
        <div>
          <h3>選項與正解</h3>
          <ol>
            {item.options.map((option) => (
              <li key={option.id}>
                {option.text}
                {option.id === item.correctOptionId ? (
                  <span className="answer-mark">
                    <CheckCircle2 aria-hidden="true" /> 正解
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="review-answer">
            {`正解：${correctOption?.text ?? "正解選項遺失"}`}
          </p>
        </div>
        <div>
          <h3>解析</h3>
          <p>{item.explanation}</p>
          <h3>提示</h3>
          <ul>
            {item.hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>來源與授權</h3>
          <p>
            {item.source.kind}・{item.source.note}
          </p>
          <code>{item.source.usageRights}</code>
          {item.source.url ? (
            <p>
              <a href={item.source.url} rel="noreferrer" target="_blank">
                開啟授權來源
              </a>
            </p>
          ) : null}
        </div>
      </section>

      <form className="question-review-form" onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled={submitting}>
          <legend>逐項確認品質標準</legend>
          <div className="review-criteria-grid">
            {reviewCriteriaKeys.map((criterion) => (
              <label key={criterion}>
                <input
                  checked={criteria[criterion]}
                  onChange={(event) =>
                    setCriteria((current) => ({
                      ...current,
                      [criterion]: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>{criteriaLabels[criterion]}</span>
              </label>
            ))}
          </div>

          <label className="review-note-field" htmlFor={`review-note-${item.id}`}>
            複核意見
            <textarea
              id={`review-note-${item.id}`}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="至少 4 個字；具體記錄判斷依據或需要修改之處。"
              rows={4}
              value={note}
            />
          </label>
          <p className="review-form-help">
            「通過複核」必須七項全數確認；「退回修正」會保留未通過項目與意見。
          </p>

          <div className="review-actions">
            <button
              className="secondary-button"
              disabled={!hasMeaningfulNote || !hasFailedCriteria || submitting}
              onClick={() => requestSubmit("changes_requested")}
              type="button"
            >
              退回修正
            </button>
            <button
              className="primary-button"
              disabled={!hasMeaningfulNote || !allCriteriaPassed || submitting}
              onClick={() => requestSubmit("approved")}
              type="button"
            >
              {submitting ? "送出中…" : "通過複核"}
            </button>
          </div>
        </fieldset>
      </form>

      {pendingVerdict ? (
        <section
          aria-labelledby={`review-confirmation-${item.id}`}
          className="review-submit-confirmation"
          role="alertdialog"
        >
          <h3 id={`review-confirmation-${item.id}`}>
            {pendingVerdict === "approved" ? "確認通過複核" : "確認退回修正"}
          </h3>
          <p>
            送出後這份真人複核紀錄不可修改或刪除；若日後發現問題，必須另走爭議流程留下新紀錄。
          </p>
          <div className="question-review-receipt-confirmation">
            <p>你將確認以下凍結內容收據：</p>
            <code>{item.contentSha256}</code>
            <code>{item.contentHashSchema}</code>
          </div>
          <div className="review-actions">
            <button
              className="primary-button"
              disabled={submitting}
              onClick={() => void confirmSubmit()}
              type="button"
            >
              {submitting
                ? "送出中…"
                : pendingVerdict === "approved"
                  ? "確認送出通過複核"
                  : "確認送出退回修正"}
            </button>
            <button
              className="secondary-button"
              disabled={submitting}
              onClick={() => setPendingVerdict(null)}
              type="button"
            >
              返回檢查
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
