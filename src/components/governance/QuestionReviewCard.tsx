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
  prompt: string;
  options: ReadonlyArray<Readonly<{ id: string; text: string }>>;
  correctOptionId: string;
  explanation: string;
  hints: ReadonlyArray<string>;
  source: Readonly<{
    kind: "original" | "licensed" | "research_reference";
    note: string;
    usageRights: string;
  }>;
  authorName: string;
  changeSummary: string | null;
  approvalCount: number;
  changeRequestCount: number;
}>;

export type QuestionReviewSubmission = Readonly<{
  questionId: string;
  questionVersion: number;
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

export function QuestionReviewCard({ item, onSubmit }: Props) {
  const [criteria, setCriteria] = useState<Record<ReviewCriterion, boolean>>({
    ...emptyCriteria,
  });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correctOption = useMemo(
    () => item.options.find((option) => option.id === item.correctOptionId),
    [item.correctOptionId, item.options],
  );
  const hasMeaningfulNote = note.trim().length >= 4;
  const allCriteriaPassed = reviewCriteriaKeys.every(
    (criterion) => criteria[criterion],
  );

  async function submit(verdict: QuestionReviewSubmission["verdict"]) {
    if (!hasMeaningfulNote || (verdict === "approved" && !allCriteriaPassed)) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        questionId: item.id,
        questionVersion: item.version,
        verdict,
        note: note.trim(),
        criteria: { ...criteria },
      });
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
          </p>
        </div>
        <div className="review-count" aria-label="複核進度">
          <ShieldCheck aria-hidden="true" />
          <strong>{`目前 ${item.approvalCount}／2 位複核通過`}</strong>
        </div>
      </header>

      {item.changeSummary ? (
        <p className="question-change-summary">
          <RotateCcw aria-hidden="true" />
          <span>本版修改：</span>
          <strong>{item.changeSummary}</strong>
        </p>
      ) : null}

      <section className="question-review-evidence" aria-label="題目內容證據">
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
              disabled={!hasMeaningfulNote || submitting}
              onClick={() => void submit("changes_requested")}
              type="button"
            >
              退回修正
            </button>
            <button
              className="primary-button"
              disabled={!hasMeaningfulNote || !allCriteriaPassed || submitting}
              onClick={() => void submit("approved")}
              type="button"
            >
              {submitting ? "送出中…" : "通過複核"}
            </button>
          </div>
        </fieldset>
      </form>

      {item.changeRequestCount > 0 ? (
        <p className="inline-form-alert" role="status">
          此版本已有 {item.changeRequestCount} 份退回意見，內容編輯者需建立新版本修正。
        </p>
      ) : null}
      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
