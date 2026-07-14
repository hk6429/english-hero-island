"use client";

import { type FormEvent, useState } from "react";
import type { Grade, QuestionPurpose, Skill } from "@/domain/questions/question-schema";

type QuestionModality = "text" | "audio" | "image";
type QuestionType =
  | "multiple_choice"
  | "listening_choice"
  | "image_choice"
  | "sentence_order";

const generatedOptionIds = ["a", "b", "c", "d", "e", "f"] as const;

export type QuestionDraftInput = Readonly<{
  id: string;
  grade: Grade;
  skill: Skill;
  indicator: string;
  microSkill: string;
  difficulty: 1 | 2 | 3;
  modality: QuestionModality;
  questionType: QuestionType;
  purpose: QuestionPurpose;
  prompt: string;
  audio?: Readonly<{ src: string; transcript: string }>;
  image?: Readonly<{ src: string; alt: string }>;
  options: ReadonlyArray<Readonly<{ id: string; text: string }>>;
  correctOptionId: string;
  explanation: string;
  hints: ReadonlyArray<string>;
  variantGroup: string;
  source: Readonly<{
    kind: "original" | "licensed" | "research_reference";
    note: string;
    usageRights: string;
    url?: string;
  }>;
}>;

export type CreatedQuestionDraft = Readonly<{
  questionId: string;
  version: number;
  status: "draft";
}>;

export type ImportedQuestionDrafts = Readonly<{
  importedCount: number;
}>;

export type QuestionRevisionRequest = Readonly<{
  questionId: string;
  fromVersion: number;
  changeSummary: string;
  draft: QuestionDraftInput;
}>;

export type QuestionRevisionContext = Readonly<{
  questionId: string;
  fromVersion: number;
  onCreateRevision: (
    request: QuestionRevisionRequest,
  ) => Promise<CreatedQuestionDraft>;
}>;

type CreateModeProps = Readonly<{
  onCreate: (draft: QuestionDraftInput) => Promise<CreatedQuestionDraft>;
  onImport: (rawJson: string) => Promise<ImportedQuestionDrafts>;
  initialDraft?: never;
  revisionContext?: never;
}>;

type RevisionModeProps = Readonly<{
  initialDraft: QuestionDraftInput;
  revisionContext: QuestionRevisionContext;
  onCreate?: (draft: QuestionDraftInput) => Promise<CreatedQuestionDraft>;
  onImport?: (rawJson: string) => Promise<ImportedQuestionDrafts>;
}>;

export type QuestionAuthoringPanelProps = CreateModeProps | RevisionModeProps;

type FormState = {
  id: string;
  grade: Grade;
  skill: Skill;
  indicator: string;
  microSkill: string;
  difficulty: 1 | 2 | 3;
  modality: QuestionModality;
  audioSrc: string;
  audioTranscript: string;
  imageSrc: string;
  imageAlt: string;
  purpose: QuestionPurpose;
  prompt: string;
  optionA: string;
  optionB: string;
  correctOptionId: string;
  explanation: string;
  hint: string;
  variantGroup: string;
  sourceKind: "original" | "licensed" | "research_reference";
  sourceNote: string;
  sourceUrl: string;
  usageRights: string;
};

const initialForm: FormState = {
  id: "",
  grade: 3,
  skill: "phonics",
  indicator: "",
  microSkill: "",
  difficulty: 1,
  modality: "text",
  audioSrc: "",
  audioTranscript: "",
  imageSrc: "",
  imageAlt: "",
  purpose: "practice",
  prompt: "",
  optionA: "",
  optionB: "",
  correctOptionId: "a",
  explanation: "",
  hint: "",
  variantGroup: "",
  sourceKind: "original",
  sourceNote: "",
  sourceUrl: "",
  usageRights: "original-for-project",
};

function formFromDraft(draft: QuestionDraftInput | undefined): FormState {
  if (!draft) return initialForm;

  return {
    id: draft.id,
    grade: draft.grade,
    skill: draft.skill,
    indicator: draft.indicator,
    microSkill: draft.microSkill,
    difficulty: draft.difficulty,
    modality: draft.modality,
    audioSrc: draft.audio?.src ?? "",
    audioTranscript: draft.audio?.transcript ?? "",
    imageSrc: draft.image?.src ?? "",
    imageAlt: draft.image?.alt ?? "",
    purpose: draft.purpose,
    prompt: draft.prompt,
    optionA: draft.options[0]?.text ?? "",
    optionB: draft.options[1]?.text ?? "",
    correctOptionId: draft.correctOptionId,
    explanation: draft.explanation,
    hint: draft.hints[0] ?? "",
    variantGroup: draft.variantGroup,
    sourceKind: draft.source.kind,
    sourceNote: draft.source.note,
    sourceUrl: draft.source.url ?? "",
    usageRights: draft.source.usageRights,
  };
}

function questionTypeFor(modality: QuestionModality): QuestionType {
  if (modality === "audio") return "listening_choice";
  if (modality === "image") return "image_choice";
  return "multiple_choice";
}

export function QuestionAuthoringPanel(props: QuestionAuthoringPanelProps) {
  const isRevisionMode = props.initialDraft !== undefined;
  const [form, setForm] = useState<FormState>(() => formFromDraft(props.initialDraft));
  const [submitting, setSubmitting] = useState(false);
  const [extraOptions, setExtraOptions] = useState<string[]>(() =>
    props.initialDraft?.options.slice(2).map((option) => option.text) ?? [],
  );
  const [optionValueIds, setOptionValueIds] = useState<string[]>(() =>
    props.initialDraft?.options.map((option) => option.id) ?? ["a", "b"],
  );
  const [extraHints, setExtraHints] = useState<string[]>(() =>
    props.initialDraft?.hints.slice(1) ?? [],
  );
  const [importing, setImporting] = useState(false);
  const [rawImport, setRawImport] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function removeExtraOption(index: number) {
    const removedId = optionValueIds[index + 2];
    setExtraOptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setOptionValueIds((current) =>
      current.filter((_, itemIndex) => itemIndex !== index + 2),
    );
    if (form.correctOptionId === removedId) {
      update("correctOptionId", optionValueIds[0] ?? "a");
    }
  }

  function addExtraOption() {
    const nextId = generatedOptionIds.find(
      (candidate) => !optionValueIds.includes(candidate),
    );
    if (!nextId) return;

    setOptionValueIds((current) => [...current, nextId]);
    setExtraOptions((current) => [...current, ""]);
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedChangeSummary = changeSummary.trim();
    if (
      isRevisionMode &&
      (normalizedChangeSummary.length < 4 || normalizedChangeSummary.length > 500)
    ) {
      setMessage(null);
      setError("修改摘要須為 4 至 500 字。");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const draft: QuestionDraftInput = {
        id: form.id.trim(),
        grade: form.grade,
        skill: form.skill,
        indicator: form.indicator.trim(),
        microSkill: form.microSkill.trim(),
        difficulty: form.difficulty,
        modality: form.modality,
        questionType:
          props.initialDraft?.modality === form.modality
            ? props.initialDraft.questionType
            : questionTypeFor(form.modality),
        purpose: form.purpose,
        prompt: form.prompt.trim(),
        ...(form.modality === "audio"
          ? {
              audio: {
                src: form.audioSrc.trim(),
                transcript: form.audioTranscript.trim(),
              },
            }
          : {}),
        ...(form.modality === "image"
          ? {
              image: {
                src: form.imageSrc.trim(),
                alt: form.imageAlt.trim(),
              },
            }
          : {}),
        options: [
          { id: optionValueIds[0] ?? "a", text: form.optionA.trim() },
          { id: optionValueIds[1] ?? "b", text: form.optionB.trim() },
          ...extraOptions.map((text, index) => ({
            id: optionValueIds[index + 2] ?? generatedOptionIds[index + 2],
            text: text.trim(),
          })),
        ],
        correctOptionId: form.correctOptionId,
        explanation: form.explanation.trim(),
        hints: [
          form.hint.trim(),
          ...extraHints.map((hint) => hint.trim()),
        ],
        variantGroup: form.variantGroup.trim(),
        source: {
          kind: form.sourceKind,
          note: form.sourceNote.trim(),
          usageRights: form.usageRights.trim(),
          ...(form.sourceUrl.trim() ? { url: form.sourceUrl.trim() } : {}),
        },
      };

      if (props.revisionContext) {
        const created = await props.revisionContext.onCreateRevision({
          questionId: props.revisionContext.questionId,
          fromVersion: props.revisionContext.fromVersion,
          changeSummary: normalizedChangeSummary,
          draft,
        });
        setMessage(
          `已建立 ${created.questionId} 第 ${created.version} 版修訂草稿。`,
        );
      } else {
        const created = await props.onCreate(draft);
        setMessage(
          `已建立 ${created.questionId} 第 ${created.version} 版草稿。`,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "草稿建立失敗。");
    } finally {
      setSubmitting(false);
    }
  }

  async function importDrafts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setMessage(null);
    setError(null);
    try {
      if (!props.onImport) {
        throw new Error("缺少批次匯入函式。");
      }
      const imported = await props.onImport(rawImport);
      setMessage(`已匯入 ${imported.importedCount} 題草稿。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "批次匯入失敗。");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="question-authoring-panel" aria-labelledby="authoring-title">
      <header>
        <p className="eyebrow">內容編輯</p>
        <h2 id="authoring-title">
          {props.revisionContext
            ? `建立第 ${props.revisionContext.fromVersion + 1} 版草稿`
            : "建立單題草稿"}
        </h2>
        <p>
          {props.revisionContext
            ? `目前以第 ${props.revisionContext.fromVersion} 版為基礎；新版仍須重新送審。`
            : "新題一律從草稿開始，送審與發布必須走獨立治理流程。"}
        </p>
      </header>

      <form className="question-authoring-form" onSubmit={createDraft}>
        <fieldset className="question-authoring-fieldset">
          <legend>題目基本資料</legend>
          <div className="governance-field-grid">
          {isRevisionMode ? (
            <label className="governance-field-wide">
              <span>修改摘要</span>
              <textarea
                maxLength={500}
                minLength={4}
                onChange={(event) => setChangeSummary(event.target.value)}
                required
                rows={3}
                value={changeSummary}
              />
            </label>
          ) : null}
          <label>
            <span>題目識別碼</span>
            <input
              onChange={(event) => update("id", event.target.value)}
              required
              value={form.id}
            />
          </label>
          <label>
            <span>年級</span>
            <select
              onChange={(event) => update("grade", Number(event.target.value) as Grade)}
              value={form.grade}
            >
              {[3, 4, 5, 6].map((grade) => (
                <option key={grade} value={grade}>{grade} 年級</option>
              ))}
            </select>
          </label>
          <label>
            <span>能力領域</span>
            <select
              onChange={(event) => update("skill", event.target.value as Skill)}
              value={form.skill}
            >
              <option value="letters">字母</option>
              <option value="phonics">自然發音</option>
              <option value="vocabulary">字彙</option>
              <option value="classroom_english">課室英語</option>
              <option value="grammar">句型文法</option>
              <option value="comprehension">理解</option>
            </select>
          </label>
          <label>
            <span>難度</span>
            <select
              onChange={(event) =>
                update("difficulty", Number(event.target.value) as 1 | 2 | 3)
              }
              value={form.difficulty}
            >
              <option value="1">1・基礎</option>
              <option value="2">2・發展</option>
              <option value="3">3・整合</option>
            </select>
          </label>
          <label className="governance-field-wide">
            <span>能力指標</span>
            <input
              onChange={(event) => update("indicator", event.target.value)}
              required
              value={form.indicator}
            />
          </label>
          <label>
            <span>微技能代碼</span>
            <input
              onChange={(event) => update("microSkill", event.target.value)}
              required
              value={form.microSkill}
            />
          </label>
          <label>
            <span>題目用途</span>
            <select
              onChange={(event) =>
                update("purpose", event.target.value as QuestionPurpose)
              }
              value={form.purpose}
            >
              <option value="diagnostic">診斷</option>
              <option value="practice">練習</option>
              <option value="boss">Boss</option>
              <option value="rescue">救援</option>
              <option value="review">跨日複習</option>
            </select>
          </label>
          <label>
            <span>媒介</span>
            <select
              onChange={(event) =>
                update("modality", event.target.value as QuestionModality)
              }
              value={form.modality}
            >
              <option value="text">文字</option>
              <option value="audio">音訊</option>
              <option value="image">圖片</option>
            </select>
          </label>
          </div>
        </fieldset>

        <fieldset className="question-authoring-fieldset">
          <legend>題目內容、選項與回饋</legend>
          <div className="governance-field-grid">
          {form.modality === "audio" ? (
            <>
              <label>
                <span>音訊網址</span>
                <input
                  onChange={(event) => update("audioSrc", event.target.value)}
                  required
                  type="url"
                  value={form.audioSrc}
                />
              </label>
              <label className="governance-field-wide">
                <span>音訊逐字稿</span>
                <textarea
                  onChange={(event) =>
                    update("audioTranscript", event.target.value)
                  }
                  required
                  rows={3}
                  value={form.audioTranscript}
                />
              </label>
            </>
          ) : null}
          {form.modality === "image" ? (
            <>
              <label>
                <span>圖片網址</span>
                <input
                  onChange={(event) => update("imageSrc", event.target.value)}
                  required
                  type="url"
                  value={form.imageSrc}
                />
              </label>
              <label className="governance-field-wide">
                <span>圖片替代文字</span>
                <input
                  onChange={(event) => update("imageAlt", event.target.value)}
                  required
                  value={form.imageAlt}
                />
              </label>
            </>
          ) : null}
          <label className="governance-field-wide">
            <span>題幹</span>
            <textarea
              onChange={(event) => update("prompt", event.target.value)}
              required
              rows={3}
              value={form.prompt}
            />
          </label>
          <label>
            <span>選項 A</span>
            <input
              onChange={(event) => update("optionA", event.target.value)}
              required
              value={form.optionA}
            />
          </label>
          <label>
            <span>選項 B</span>
            <input
              onChange={(event) => update("optionB", event.target.value)}
              required
              value={form.optionB}
            />
          </label>
          {extraOptions.map((text, index) => {
            const optionId = optionValueIds[index + 2];
            const optionLabel = generatedOptionIds[index + 2].toUpperCase();
            return (
              <div
                className="governance-option-field"
                key={`${optionId}-${index}`}
              >
                <label>
                  <span>選項 {optionLabel}</span>
                  <input
                    onChange={(event) =>
                      setExtraOptions((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    required
                    value={text}
                  />
                </label>
                <button
                  aria-label={`移除選項 ${optionLabel}`}
                  onClick={() => removeExtraOption(index)}
                  type="button"
                >
                  移除
                </button>
              </div>
            );
          })}
          <button
            className="secondary-button"
            disabled={extraOptions.length >= 4}
            onClick={addExtraOption}
            type="button"
          >
            新增選項
          </button>
          <label>
            <span>正解</span>
            <select
              onChange={(event) =>
                update("correctOptionId", event.target.value)
              }
              value={form.correctOptionId}
            >
              {optionValueIds
                .slice(0, extraOptions.length + 2)
                .map((optionId, index) => (
                <option key={`${optionId}-${index}`} value={optionId}>
                  {generatedOptionIds[index].toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="governance-field-wide">
            <span>解析</span>
            <textarea
              onChange={(event) => update("explanation", event.target.value)}
              required
              rows={3}
              value={form.explanation}
            />
          </label>
          <label className="governance-field-wide">
            <span>第一層提示</span>
            <input
              onChange={(event) => update("hint", event.target.value)}
              required
              value={form.hint}
            />
          </label>
          {extraHints.map((hint, index) => (
            <label className="governance-field-wide" key={`hint-${index + 2}`}>
              <span>第 {index + 2} 層提示</span>
              <input
                onChange={(event) =>
                  setExtraHints((current) =>
                    current.map((value, itemIndex) =>
                      itemIndex === index ? event.target.value : value,
                    ),
                  )
                }
                required
                value={hint}
              />
            </label>
          ))}
          <label>
            <span>變式群組</span>
            <input
              onChange={(event) => update("variantGroup", event.target.value)}
              required
              value={form.variantGroup}
            />
          </label>
          </div>
        </fieldset>

        <fieldset className="question-authoring-fieldset">
          <legend>來源與使用權利</legend>
          <div className="governance-field-grid">
          <label>
            <span>來源類型</span>
            <select
              onChange={(event) =>
                update(
                  "sourceKind",
                  event.target.value as FormState["sourceKind"],
                )
              }
              value={form.sourceKind}
            >
              <option value="original">原創</option>
              <option value="licensed">已授權</option>
              <option value="research_reference">研究參考</option>
            </select>
          </label>
          <label className="governance-field-wide">
            <span>來源說明</span>
            <input
              onChange={(event) => update("sourceNote", event.target.value)}
              required
              value={form.sourceNote}
            />
          </label>
          <label className="governance-field-wide">
            <span>來源網址</span>
            <input
              onChange={(event) => update("sourceUrl", event.target.value)}
              type="url"
              value={form.sourceUrl}
            />
          </label>
          <label>
            <span>使用權利</span>
            <input
              onChange={(event) => update("usageRights", event.target.value)}
              required
              value={form.usageRights}
            />
          </label>
          </div>
        </fieldset>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting
            ? isRevisionMode
              ? "建立新版中…"
              : "建立中…"
            : isRevisionMode
              ? "建立新版"
              : "建立草稿"}
        </button>
      </form>

      {!isRevisionMode ? (
        <form className="question-import-form" onSubmit={importDrafts}>
          <h3>批次匯入草稿</h3>
          <p>
            貼上題號與題目內容 JSON 陣列；不用填版本、狀態、作者或複核者，這些治理欄位由伺服器建立。全部通過驗證才會一次寫入。
          </p>
          <label>
            <span>題目 JSON 陣列</span>
            <textarea
              onChange={(event) => setRawImport(event.target.value)}
              required
              rows={10}
              spellCheck={false}
              value={rawImport}
            />
          </label>
          <button className="secondary-button" disabled={importing} type="submit">
            {importing ? "驗證與匯入中…" : "驗證並匯入"}
          </button>
        </form>
      ) : null}

      {message ? <p className="login-success" role="status">{message}</p> : null}
      {error ? <p className="inline-form-alert" role="alert">{error}</p> : null}
    </section>
  );
}
