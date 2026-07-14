"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  QuestionAuthoringPanel,
  type QuestionDraftInput,
} from "@/components/governance/QuestionAuthoringPanel";
import {
  QuestionLibraryPanel,
  type QuestionLibraryAction,
} from "@/components/governance/QuestionLibraryPanel";
import { QuestionQualityPanel } from "@/components/governance/QuestionQualityPanel";
import {
  QuestionVersionComparison,
  type QuestionVersionSnapshot,
} from "@/components/governance/QuestionVersionComparison";
import { buildQuestionQualityView } from "@/features/governance/question-quality-view";
import type { ContentAssetCheck } from "@/domain/questions/content-quality";
import { probeQuestionAssets } from "@/infrastructure/assets/question-asset-probe";
import {
  createQuestionDraftWithSupabase,
  createQuestionRevisionWithSupabase,
  importQuestionDraftsFromJsonWithSupabase,
  listQuestionQualitySignalsWithSupabase,
  listQuestionVersionsWithSupabase,
  searchQuestionBankWithSupabase,
  submitQuestionForReviewWithSupabase,
  type QuestionBankItem,
  type QuestionQualitySignal,
} from "@/infrastructure/supabase/question-management-gateway";
import {
  publishQuestionVersionWithSupabase,
  reportQuestionDisputeWithSupabase,
  retireQuestionVersionWithSupabase,
} from "@/infrastructure/supabase/question-governance-gateway";

type Props = Readonly<{
  assetProbe?: (
    questions: ReadonlyArray<QuestionBankItem>,
  ) => Promise<ReadonlyArray<ContentAssetCheck>>;
  client: SupabaseClient;
  displayName: string;
  onSignOut?: () => Promise<void> | void;
  role: "content_editor" | "administrator";
}>;

function defaultAssetProbe(questions: ReadonlyArray<QuestionBankItem>) {
  return probeQuestionAssets(questions, { origin: window.location.origin });
}

const editorActions: ReadonlyArray<QuestionLibraryAction["type"]> = [
  "submit_for_review",
  "create_revision",
];

const administratorActions: ReadonlyArray<QuestionLibraryAction["type"]> = [
  ...editorActions,
  "publish",
  "retire",
  "dispute",
];

const statusLabels: Readonly<Record<QuestionBankItem["status"], string>> = {
  draft: "草稿",
  in_review: "複核中",
  reviewed: "已複核",
  published: "已發布",
  disputed: "有爭議",
  retired: "已停用",
};

const questionBankPageSize = 100;

async function loadCompleteQuestionBank(client: SupabaseClient) {
  const items: QuestionBankItem[] = [];
  const visitedCursors = new Set<string>();
  let cursor:
    | Readonly<{
        createdAt: string;
        questionId: string;
        questionVersion: number;
      }>
    | undefined;

  while (true) {
    const page = await searchQuestionBankWithSupabase(client, {
      cursor,
      limit: questionBankPageSize,
    });
    items.push(...page.items);

    if (!page.nextCursor) break;
    const cursorKey = `${page.nextCursor.createdAt}:${page.nextCursor.questionId}:${page.nextCursor.questionVersion}`;
    if (visitedCursors.has(cursorKey)) {
      throw new Error("題庫分頁游標重複，已停止載入以避免資料遺漏。");
    }
    visitedCursors.add(cursorKey);
    cursor = page.nextCursor;
  }

  return items;
}

function toDraft(item: QuestionBankItem): QuestionDraftInput {
  return {
    id: item.id,
    grade: item.grade,
    skill: item.skill,
    indicator: item.indicator,
    microSkill: item.microSkill,
    difficulty: item.difficulty,
    modality: item.modality,
    questionType: item.questionType,
    purpose: item.purpose,
    prompt: item.prompt,
    ...(item.audio ? { audio: item.audio } : {}),
    ...(item.image ? { image: item.image } : {}),
    options: item.options,
    correctOptionId: item.correctOptionId,
    explanation: item.explanation,
    hints: item.hints,
    variantGroup: item.variantGroup,
    source: item.source,
  };
}

export function toVersionSnapshot(item: QuestionBankItem): QuestionVersionSnapshot {
  return {
    questionId: item.id,
    version: item.version,
    statusLabel: statusLabels[item.status],
    changeSummary: item.changeSummary,
    fields: [
      { key: "grade", label: "年級", value: item.grade },
      { key: "skill", label: "能力領域", value: item.skill },
      { key: "indicator", label: "能力指標", value: item.indicator },
      { key: "microSkill", label: "微技能", value: item.microSkill },
      { key: "difficulty", label: "難度", value: item.difficulty },
      { key: "modality", label: "媒介", value: item.modality },
      { key: "purpose", label: "用途", value: item.purpose },
      { key: "prompt", label: "題幹", value: item.prompt },
      {
        key: "options",
        label: "選項",
        value: item.options.map((option) => `${option.id}：${option.text}`),
      },
      { key: "correct", label: "正解", value: item.correctOptionId },
      { key: "explanation", label: "解析", value: item.explanation },
      { key: "hints", label: "提示", value: item.hints },
      { key: "variantGroup", label: "變式群組", value: item.variantGroup },
      {
        key: "source",
        label: "來源與授權",
        value: [
          item.source.kind,
          item.source.usageRights,
          item.source.note,
          item.source.url ?? "未提供來源網址",
        ],
      },
      {
        key: "audioSrc",
        label: "音訊來源",
        value: item.audio?.src ?? null,
      },
      {
        key: "audioTranscript",
        label: "音訊逐字稿",
        value: item.audio?.transcript ?? null,
      },
      { key: "imageSrc", label: "圖片來源", value: item.image?.src ?? null },
      { key: "imageAlt", label: "圖片替代文字", value: item.image?.alt ?? null },
    ],
  };
}

export function QuestionManagementWorkspace({
  assetProbe = defaultAssetProbe,
  client,
  displayName,
  onSignOut,
  role,
}: Props) {
  const [items, setItems] = useState<ReadonlyArray<QuestionBankItem>>([]);
  const [signals, setSignals] = useState<ReadonlyArray<QuestionQualitySignal>>([]);
  const [assetChecks, setAssetChecks] = useState<
    ReadonlyArray<ContentAssetCheck>
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<QuestionLibraryAction | null>(
    null,
  );
  const [actionNote, setActionNote] = useState("");
  const [acting, setActing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<QuestionBankItem | null>(
    null,
  );
  const [versionHistory, setVersionHistory] = useState<
    ReadonlyArray<QuestionBankItem>
  >([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [bank, quality] = await Promise.all([
        loadCompleteQuestionBank(client),
        listQuestionQualitySignalsWithSupabase(client),
      ]);
      let checks: ReadonlyArray<ContentAssetCheck> = [];
      try {
        checks = await assetProbe(bank);
      } catch {
        checks = [];
      }
      setItems(bank);
      setSignals(quality);
      setAssetChecks(checks);
    } catch (cause) {
      setItems([]);
      setSignals([]);
      setAssetChecks([]);
      setMessage(cause instanceof Error ? cause.message : "題庫管理資料載入失敗。");
    } finally {
      setLoading(false);
    }
  }, [assetProbe, client]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      await reload();
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const qualityView = buildQuestionQualityView(items, signals, assetChecks);
  const blockedPublishKeys = new Set(
    qualityView.findings
      .filter((finding) => finding.severity === "blocking")
      .map((finding) => `${finding.questionId}:${finding.questionVersion}`),
  );

  async function beginAction(action: QuestionLibraryAction) {
    if (action.type === "create_revision") {
      const target = items.find(
        (item) =>
          item.id === action.questionId && item.version === action.questionVersion,
      );
      if (!target) return;
      setPendingAction(null);
      setLoadingVersions(true);
      setVersionError(null);
      try {
        setVersionHistory(
          await listQuestionVersionsWithSupabase(client, action.questionId),
        );
        setRevisionTarget(target);
      } catch (cause) {
        setRevisionTarget(null);
        setVersionHistory([]);
        setVersionError(
          cause instanceof Error ? cause.message : "題目版本歷程載入失敗。",
        );
      } finally {
        setLoadingVersions(false);
      }
      return;
    }
    setPendingAction(action);
    setActionNote("");
    setActionMessage(null);
    setActionError(null);
  }

  async function confirmAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction || pendingAction.type === "create_revision") return;
    setActing(true);
    setActionMessage(null);
    setActionError(null);
    try {
      if (pendingAction.type === "submit_for_review") {
        await submitQuestionForReviewWithSupabase(
          client,
          pendingAction.questionId,
          pendingAction.questionVersion,
          actionNote,
        );
        setActionMessage(`第 ${pendingAction.questionVersion} 版已送交複核。`);
      } else if (pendingAction.type === "publish") {
        await publishQuestionVersionWithSupabase(
          client,
          pendingAction.questionId,
          pendingAction.questionVersion,
          actionNote,
        );
        setActionMessage(`第 ${pendingAction.questionVersion} 版已正式發布。`);
      } else if (pendingAction.type === "retire") {
        await retireQuestionVersionWithSupabase(
          client,
          pendingAction.questionId,
          pendingAction.questionVersion,
          actionNote,
        );
        setActionMessage(`第 ${pendingAction.questionVersion} 版已停用。`);
      } else {
        await reportQuestionDisputeWithSupabase(
          client,
          pendingAction.questionId,
          pendingAction.questionVersion,
          actionNote,
        );
        setActionMessage(`第 ${pendingAction.questionVersion} 版已回報爭議。`);
      }
      setPendingAction(null);
      setActionNote("");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "治理動作失敗。");
    } finally {
      setActing(false);
    }
  }

  const actionLabels = pendingAction
    ? {
        submit_for_review: ["送交複核", "確認送交複核"],
        publish: ["發布版本", "確認發布版本"],
        retire: ["停用版本", "確認停用版本"],
        dispute: ["回報爭議", "確認回報爭議"],
        create_revision: ["建立新版", "繼續建立新版"],
      }[pendingAction.type]
    : null;
  const revisionAfter = revisionTarget
    ? versionHistory.find(
        (version) =>
          version.id === revisionTarget.id &&
          version.version === revisionTarget.version,
      ) ?? revisionTarget
    : null;
  const revisionBefore = revisionAfter?.supersedesVersion
    ? versionHistory.find(
        (version) => version.version === revisionAfter.supersedesVersion,
      ) ?? null
    : null;

  return (
    <section className="question-management-workspace" aria-labelledby="management-title">
      <header className="split-heading">
        <div>
          <p className="eyebrow">題庫治理・內容管理</p>
          <h1 id="management-title">題庫管理工作區</h1>
          <p>{displayName}，所有建立、送審與發布動作都會留下伺服器紀錄。</p>
        </div>
        <div className="governance-session-controls">
          <strong>{`${displayName}・${role === "administrator" ? "管理員" : "內容編輯"}`}</strong>
          {onSignOut ? (
            <button className="secondary-button" onClick={() => void onSignOut()} type="button">
              登出題庫治理
            </button>
          ) : null}
        </div>
      </header>

      {loading ? <p className="loading-state" role="status">正在載入題庫與品質訊號…</p> : null}
      {message ? (
        <section className="classroom-setup-gate">
          <h2>題庫管理資料暫時無法使用</h2>
          <p>{message}</p>
          <button className="secondary-button" onClick={() => void reload()} type="button">
            重新載入
          </button>
        </section>
      ) : null}

      {!loading && !message ? (
        <div className="question-management-sections">
          {revisionTarget ? (
            <section className="question-revision-workspace" aria-label="建立題目新版">
              <button
                className="secondary-button"
                onClick={() => {
                  setRevisionTarget(null);
                  setVersionHistory([]);
                }}
                type="button"
              >
                取消建立新版
              </button>
              {revisionBefore && revisionAfter ? (
                <QuestionVersionComparison
                  after={toVersionSnapshot(revisionAfter)}
                  before={toVersionSnapshot(revisionBefore)}
                />
              ) : (
                <p>這是目前第一個版本，沒有前一版可供比較。</p>
              )}
              <QuestionAuthoringPanel
                initialDraft={toDraft(revisionTarget)}
                revisionContext={{
                  questionId: revisionTarget.id,
                  fromVersion: revisionTarget.version,
                  onCreateRevision: async (request) => {
                    const created = await createQuestionRevisionWithSupabase(
                      client,
                      request,
                    );
                    setActionMessage(
                      `${created.questionId} 第 ${created.version} 版修訂草稿已建立。`,
                    );
                    setRevisionTarget(null);
                    setVersionHistory([]);
                    await reload();
                    return created;
                  },
                }}
              />
            </section>
          ) : (
            <QuestionAuthoringPanel
              onCreate={async (draft) => {
                const created = await createQuestionDraftWithSupabase(client, draft);
                await reload();
                return created;
              }}
              onImport={async (rawJson) => {
                const imported = await importQuestionDraftsFromJsonWithSupabase(
                  client,
                  rawJson,
                );
                await reload();
                return imported;
              }}
            />
          )}
          {loadingVersions ? <p className="loading-state" role="status">正在載入版本歷程…</p> : null}
          {versionError ? <p className="inline-form-alert" role="alert">{versionError}</p> : null}
          <QuestionLibraryPanel
            allowedActions={
              role === "administrator" ? administratorActions : editorActions
            }
            blockedPublishKeys={blockedPublishKeys}
            items={items}
            onAction={beginAction}
          />
          {pendingAction && pendingAction.type !== "create_revision" && actionLabels ? (
            <form className="governance-action-form" onSubmit={confirmAction}>
              <h3>{actionLabels[0]}</h3>
              <p>
                {pendingAction.questionId}・第 {pendingAction.questionVersion} 版
              </p>
              <label>
                <span>治理說明</span>
                <textarea
                  minLength={4}
                  onChange={(event) => setActionNote(event.target.value)}
                  required
                  rows={4}
                  value={actionNote}
                />
              </label>
              <div className="governance-action-buttons">
                <button className="primary-button" disabled={acting} type="submit">
                  {acting ? "處理中…" : actionLabels[1]}
                </button>
                <button
                  className="secondary-button"
                  disabled={acting}
                  onClick={() => setPendingAction(null)}
                  type="button"
                >
                  取消
                </button>
              </div>
            </form>
          ) : null}
          {actionMessage ? <p className="login-success" role="status">{actionMessage}</p> : null}
          {actionError ? <p className="inline-form-alert" role="alert">{actionError}</p> : null}
          <QuestionQualityPanel
            assetDataState={qualityView.assetDataState}
            dataState={qualityView.dataState}
            findings={qualityView.findings}
          />
        </div>
      ) : null}
    </section>
  );
}
