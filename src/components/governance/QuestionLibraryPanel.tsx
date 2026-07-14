"use client";

import { useMemo, useState } from "react";
import styles from "./governance.module.css";

export type QuestionLibraryStatus =
  | "draft"
  | "in_review"
  | "reviewed"
  | "published"
  | "disputed"
  | "retired";

export type QuestionLibraryItem = Readonly<{
  id: string;
  version: number;
  grade: 3 | 4 | 5 | 6;
  status: QuestionLibraryStatus;
  microSkill: string;
  prompt: string;
  audio?: Readonly<{ src: string; transcript: string }> | null;
  image?: Readonly<{ src: string; alt: string }> | null;
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
}>;

export type QuestionLibraryAction = Readonly<{
  type:
    | "submit_for_review"
    | "publish"
    | "retire"
    | "create_revision"
    | "dispute";
  questionId: string;
  questionVersion: number;
}>;

type Props = Readonly<{
  allowedActions?: ReadonlyArray<QuestionLibraryAction["type"]>;
  blockedPublishKeys?: ReadonlySet<string>;
  items: ReadonlyArray<QuestionLibraryItem>;
  onAction: (action: QuestionLibraryAction) => void | Promise<void>;
}>;

const allActions: ReadonlyArray<QuestionLibraryAction["type"]> = [
  "submit_for_review",
  "publish",
  "retire",
  "create_revision",
  "dispute",
];
const noBlockedPublishKeys = new Set<string>();

const statusLabels: Readonly<Record<QuestionLibraryStatus, string>> = {
  draft: "草稿",
  in_review: "複核中",
  reviewed: "已複核",
  published: "已發布",
  disputed: "有爭議",
  retired: "已停用",
};

const sourceLabels: Readonly<
  Record<QuestionLibraryItem["source"]["kind"], string>
> = {
  original: "原創",
  licensed: "已授權",
  research_reference: "研究參考",
};

function itemKey(item: QuestionLibraryItem) {
  return `${item.id}:${item.version}`;
}

function decodeTtsSource(src: string) {
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

export function QuestionLibraryPanel({
  allowedActions = allActions,
  blockedPublishKeys = noBlockedPublishKeys,
  items,
  onAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<"all" | `${QuestionLibraryItem["grade"]}`>(
    "all",
  );
  const [status, setStatus] = useState<"all" | QuestionLibraryStatus>("all");
  const [microSkill, setMicroSkill] = useState("all");
  const [selectedKey, setSelectedKey] = useState(() =>
    items[0] ? itemKey(items[0]) : "",
  );

  const microSkills = useMemo(
    () =>
      [...new Set(items.map((item) => item.microSkill))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const searchableText = [
        item.id,
        item.prompt,
        item.microSkill,
        item.source.note,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (grade === "all" || item.grade === Number(grade)) &&
        (status === "all" || item.status === status) &&
        (microSkill === "all" || item.microSkill === microSkill)
      );
    });
  }, [grade, items, microSkill, query, status]);

  const selectedItem =
    filteredItems.find((item) => itemKey(item) === selectedKey) ??
    filteredItems[0];

  const correctOption = selectedItem?.options.find(
    (option) => option.id === selectedItem.correctOptionId,
  );
  const selectedItemKey = selectedItem ? itemKey(selectedItem) : "";
  const publishBlocked = blockedPublishKeys.has(selectedItemKey);
  const selectedIsLatestVersion = selectedItem
    ? selectedItem.version ===
      Math.max(
        ...items
          .filter((item) => item.id === selectedItem.id)
          .map((item) => item.version),
      )
    : false;

  function emitAction(type: QuestionLibraryAction["type"]) {
    if (!selectedItem) return;
    void onAction({
      type,
      questionId: selectedItem.id,
      questionVersion: selectedItem.version,
    });
  }

  function canRun(type: QuestionLibraryAction["type"]) {
    return allowedActions.includes(type);
  }

  return (
    <section aria-label="題庫管理">
      <header>
        <h2>題庫管理</h2>
        <p>搜尋、篩選並預覽每一個凍結版本。</p>
      </header>

      <fieldset>
        <legend>題庫篩選條件</legend>
        <label htmlFor="question-library-search">搜尋題目</label>
        <input
          id="question-library-search"
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          value={query}
        />

        <label htmlFor="question-library-grade">年級</label>
        <select
          id="question-library-grade"
          onChange={(event) =>
            setGrade(
              event.target.value as
                | "all"
                | `${QuestionLibraryItem["grade"]}`,
            )
          }
          value={grade}
        >
          <option value="all">全部年級</option>
          {[3, 4, 5, 6].map((option) => (
            <option key={option} value={option}>
              {`${option} 年級`}
            </option>
          ))}
        </select>

        <label htmlFor="question-library-status">版本狀態</label>
        <select
          id="question-library-status"
          onChange={(event) =>
            setStatus(event.target.value as "all" | QuestionLibraryStatus)
          }
          value={status}
        >
          <option value="all">全部狀態</option>
          {(Object.keys(statusLabels) as ReadonlyArray<QuestionLibraryStatus>).map(
            (option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ),
          )}
        </select>

        <label htmlFor="question-library-micro-skill">微技能</label>
        <select
          id="question-library-micro-skill"
          onChange={(event) => setMicroSkill(event.target.value)}
          value={microSkill}
        >
          <option value="all">全部微技能</option>
          {microSkills.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </fieldset>

      <p aria-live="polite">{`顯示 ${filteredItems.length}／${items.length} 題`}</p>

      {selectedItem ? (
        <div>
          <section aria-labelledby="question-library-list-heading">
            <h3 id="question-library-list-heading">題目清單</h3>
            <ul>
              {filteredItems.map((item) => (
                <li key={itemKey(item)}>
                  <button
                    aria-label={`預覽 ${item.prompt}，第 ${item.version} 版，${statusLabels[item.status]}`}
                    aria-pressed={itemKey(item) === itemKey(selectedItem)}
                    onClick={() => setSelectedKey(itemKey(item))}
                    type="button"
                  >
                    <strong>{item.prompt}</strong>
                    <span>{`${item.grade} 年級・${item.microSkill}`}</span>
                    <span
                      className={styles.statusBadge}
                      data-status={item.status}
                    >
                      {`第 ${item.version} 版・${statusLabels[item.status]}`}
                    </span>
                    <span>{`${sourceLabels[item.source.kind]}｜${item.source.usageRights}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <article aria-labelledby={`question-preview-${selectedItem.id}`}>
            <p>{`第 ${selectedItem.version} 版`}</p>
            <p
              className={styles.statusBadge}
              data-status={selectedItem.status}
            >{`狀態：${statusLabels[selectedItem.status]}`}</p>
            <h3 id={`question-preview-${selectedItem.id}`}>
              {selectedItem.prompt}
            </h3>
            {selectedItem.audio ? (
              <section className="question-preview-asset" aria-label="音訊預覽">
                <h4>音訊</h4>
                {decodeTtsSource(selectedItem.audio.src) ? (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      playTts(
                        decodeTtsSource(selectedItem.audio?.src ?? "") ??
                          selectedItem.audio?.transcript ??
                          "",
                      )
                    }
                    type="button"
                  >
                    播放預覽音訊
                  </button>
                ) : (
                  <audio
                    aria-label="播放預覽音訊"
                    controls
                    preload="none"
                    src={selectedItem.audio.src}
                  />
                )}
                <p>{`逐字稿：${selectedItem.audio.transcript}`}</p>
              </section>
            ) : null}
            {selectedItem.image ? (
              <figure className="question-preview-asset">
                {/* Governed content can reference approved remote media. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={selectedItem.image.alt}
                  loading="lazy"
                  src={selectedItem.image.src}
                />
                <figcaption>{`替代文字：${selectedItem.image.alt}`}</figcaption>
              </figure>
            ) : null}
            <p>{`來源：${sourceLabels[selectedItem.source.kind]}`}</p>
            <p>{selectedItem.source.note}</p>
            <p>{`授權：${selectedItem.source.usageRights}`}</p>
            {selectedItem.source.url ? (
              <p>
                <a
                  href={selectedItem.source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  開啟來源網址
                </a>
              </p>
            ) : null}
            <p>{`正解：${correctOption?.text ?? "正解選項遺失"}`}</p>
            <h4>選項</h4>
            <ol>
              {selectedItem.options.map((option) => (
                <li key={option.id}>{option.text}</li>
              ))}
            </ol>
            <h4>解析</h4>
            <p>{selectedItem.explanation}</p>
            <h4>提示</h4>
            <ul>
              {selectedItem.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
            <div aria-label="治理動作" role="group">
              {selectedItem.status === "draft" && canRun("submit_for_review") ? (
                <button
                  onClick={() => emitAction("submit_for_review")}
                  type="button"
                >
                  送交複核
                </button>
              ) : null}
              {selectedItem.status === "reviewed" && canRun("publish") ? (
                <button
                  aria-describedby={publishBlocked ? "question-publish-blocked" : undefined}
                  disabled={publishBlocked}
                  onClick={() => emitAction("publish")}
                  type="button"
                >
                  發布此版本
                </button>
              ) : null}
              {selectedItem.status === "published" && canRun("retire") ? (
                <button onClick={() => emitAction("retire")} type="button">
                  停用此版本
                </button>
              ) : null}
              {["reviewed", "published"].includes(selectedItem.status) &&
              canRun("dispute") ? (
                <button onClick={() => emitAction("dispute")} type="button">
                  回報爭議
                </button>
              ) : null}
              {["reviewed", "published", "disputed", "retired"].includes(
                selectedItem.status,
              ) && selectedIsLatestVersion && canRun("create_revision") ? (
                <button
                  onClick={() => emitAction("create_revision")}
                  type="button"
                >
                  建立新版
                </button>
              ) : null}
            </div>
            {publishBlocked ? (
              <p className="inline-form-alert" id="question-publish-blocked" role="status">
                此版本仍有阻擋發布的品質問題，請先完成修正。
              </p>
            ) : null}
          </article>
        </div>
      ) : (
        <p role="status">目前沒有符合條件的題目，請調整搜尋或篩選條件。</p>
      )}
    </section>
  );
}
