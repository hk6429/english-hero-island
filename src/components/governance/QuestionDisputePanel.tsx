"use client";

import { type FormEvent, useMemo, useState } from "react";

export type QuestionDisputeCandidate = Readonly<{
  id: string;
  version: number;
  prompt: string;
}>;

type Props = Readonly<{
  items: ReadonlyArray<QuestionDisputeCandidate>;
  onSubmit: (input: {
    questionId: string;
    questionVersion: number;
    note: string;
  }) => Promise<void>;
}>;

function candidateKey(item: QuestionDisputeCandidate) {
  return `${item.id}:${item.version}`;
}

export function QuestionDisputePanel({ items, onSubmit }: Props) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(() =>
    items[0] ? candidateKey(items[0]) : "",
  );
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      `${item.id} ${item.prompt}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);
  const selected =
    visibleItems.find((item) => candidateKey(item) === selectedKey) ??
    visibleItems[0] ??
    null;
  const canPrepare = Boolean(selected && note.trim().length >= 4 && !submitting);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPrepare) return;
    setConfirming(true);
    setMessage(null);
    setError(null);
  }

  async function confirm() {
    if (!selected || !canPrepare) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        questionId: selected.id,
        questionVersion: selected.version,
        note: note.trim(),
      });
      setMessage(`${selected.id} 第 ${selected.version} 版已標記為有爭議。`);
      setNote("");
      setConfirming(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "爭議回報失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="question-dispute-panel" aria-labelledby="dispute-panel-title">
      <header>
        <p className="eyebrow">發布後安全網</p>
        <h2 id="dispute-panel-title">回報已發布題目爭議</h2>
        <p>發現英文、答案、音訊、圖片或授權問題時，立即留下不可竄改的爭議紀錄。</p>
      </header>

      {items.length === 0 ? (
        <p>目前沒有可回報的已發布題目。</p>
      ) : (
        <form className="question-dispute-form" onSubmit={prepare}>
          <label>
            <span>搜尋已發布題目</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入題號或題幹"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span>選擇題目版本</span>
            <select
              onChange={(event) => setSelectedKey(event.target.value)}
              value={selected ? candidateKey(selected) : ""}
            >
              {visibleItems.length === 0 ? (
                <option value="">沒有符合的題目</option>
              ) : (
                visibleItems.map((item) => (
                  <option key={candidateKey(item)} value={candidateKey(item)}>
                    {item.id}・第 {item.version} 版・{item.prompt}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            <span>爭議說明</span>
            <textarea
              maxLength={1000}
              minLength={4}
              onChange={(event) => setNote(event.target.value)}
              placeholder="至少 4 個字，具體說明問題與重現方式。"
              required
              rows={4}
              value={note}
            />
          </label>
          <button className="secondary-button" disabled={!canPrepare} type="submit">
            準備回報爭議
          </button>
        </form>
      )}

      {confirming && selected ? (
        <section
          aria-labelledby="dispute-confirm-title"
          className="review-submit-confirmation"
          role="alertdialog"
        >
          <h3 id="dispute-confirm-title">確認回報爭議</h3>
          <p>
            這會立即阻擋該版本繼續派題，並永久保存回報者、時間與說明；請確認題號與版本正確。
          </p>
          <div className="review-actions">
            <button
              className="primary-button"
              disabled={submitting}
              onClick={() => void confirm()}
              type="button"
            >
              {submitting ? "回報中…" : "確認送出爭議"}
            </button>
            <button
              className="secondary-button"
              disabled={submitting}
              onClick={() => setConfirming(false)}
              type="button"
            >
              返回檢查
            </button>
          </div>
        </section>
      ) : null}

      {message ? <p className="login-success" role="status">{message}</p> : null}
      {error ? <p className="inline-form-alert" role="alert">{error}</p> : null}
    </section>
  );
}
