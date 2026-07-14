"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Cable, Inbox, KeyRound, MailCheck, ShieldAlert } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  QuestionDisputePanel,
  type QuestionDisputeCandidate,
} from "@/components/governance/QuestionDisputePanel";
import {
  QuestionReviewCard,
  type QuestionReviewQueueItem,
  type QuestionReviewSubmission,
} from "@/components/governance/QuestionReviewCard";
import { QuestionManagementWorkspace } from "@/features/governance/QuestionManagementWorkspace";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import {
  getContentGovernanceProfileWithSupabase,
  type ContentGovernanceProfile,
  searchQuestionBankWithSupabase,
} from "@/infrastructure/supabase/question-management-gateway";
import {
  listQuestionReviewQueueWithSupabase,
  reportQuestionDisputeWithSupabase,
  submitQuestionReviewWithSupabase,
} from "@/infrastructure/supabase/question-governance-gateway";

type Props = Readonly<{
  client?: SupabaseClient | null;
}>;

export function QuestionReviewWorkspace({ client }: Props) {
  const activeClient = useMemo(
    () => (client === undefined ? createBrowserSupabaseClient("teacher") : client),
    [client],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(activeClient));
  const [profile, setProfile] = useState<ContentGovernanceProfile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [queue, setQueue] = useState<ReadonlyArray<QuestionReviewQueueItem>>([]);
  const [disputeCandidates, setDisputeCandidates] = useState<
    ReadonlyArray<QuestionDisputeCandidate>
  >([]);
  const [disputeLoadError, setDisputeLoadError] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!activeClient) return;
    setLoadingQueue(true);
    setMessage(null);
    try {
      setQueue(await listQuestionReviewQueueWithSupabase(activeClient));
    } catch (cause) {
      setQueue([]);
      setMessage(
        cause instanceof Error ? cause.message : "待複核題目載入失敗。",
      );
    } finally {
      setLoadingQueue(false);
    }
  }, [activeClient]);

  const loadDisputeCandidates = useCallback(async () => {
    if (!activeClient) return;
    try {
      const candidates: QuestionDisputeCandidate[] = [];
      let cursor:
        | Readonly<{
            createdAt: string;
            questionId: string;
            questionVersion: number;
          }>
        | undefined;
      do {
        const page = await searchQuestionBankWithSupabase(activeClient, {
          status: "published",
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        candidates.push(
          ...page.items.map((item) => ({
            id: item.id,
            version: item.version,
            prompt: item.prompt,
          })),
        );
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      setDisputeCandidates(candidates);
      setDisputeLoadError(null);
    } catch (cause) {
      setDisputeCandidates([]);
      setDisputeLoadError(
        cause instanceof Error ? cause.message : "已發布題目清單載入失敗。",
      );
    }
  }, [activeClient]);

  useEffect(() => {
    if (!activeClient) return;
    let mounted = true;

    void activeClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setMessage(error ? "無法確認複核者登入狀態，請重新整理後再試。" : null);
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data } = activeClient.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [activeClient]);

  useEffect(() => {
    if (!activeClient || !session || session.user.is_anonymous) return;
    let mounted = true;
    const profileTimer = window.setTimeout(() => {
      if (!mounted) return;
      setCheckingProfile(true);
      setMessage(null);
      void getContentGovernanceProfileWithSupabase(activeClient)
        .then((nextProfile) => {
          if (!mounted) return;
          setProfile(nextProfile);
          if (nextProfile.approvalStatus !== "approved") {
            setMessage("你的題庫治理身分尚未核准，請聯絡系統管理員。");
          }
        })
        .catch((cause) => {
          if (!mounted) return;
          setProfile(null);
          setMessage(
            cause instanceof Error ? cause.message : "題庫治理身分確認失敗。",
          );
        })
        .finally(() => {
          if (mounted) setCheckingProfile(false);
        });
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(profileTimer);
    };
  }, [activeClient, session]);

  useEffect(() => {
    if (profile?.approvalStatus !== "approved" || profile.role !== "english_teacher") {
      return;
    }
    const loadTimer = window.setTimeout(() => {
      void Promise.all([loadQueue(), loadDisputeCandidates()]);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadDisputeCandidates, loadQueue, profile]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClient || !email.trim()) return;
    setMessage(null);

    const { error } = await activeClient.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/governance` },
    });
    if (error) {
      setMessage("登入連結寄送失敗，請確認信箱或稍後再試。");
      return;
    }
    setMagicLinkSent(true);
  }

  async function submitReview(submission: QuestionReviewSubmission) {
    if (!activeClient) return;
    await submitQuestionReviewWithSupabase(activeClient, submission);
    await loadQueue();
  }

  async function signOut() {
    if (!activeClient || signingOut) return;
    setSigningOut(true);
    setMessage(null);
    const { error } = await activeClient.auth.signOut();
    if (error) {
      setMessage("登出失敗，請重新整理後再試。");
      setSigningOut(false);
      return;
    }
    setQueue([]);
    setDisputeCandidates([]);
    setProfile(null);
    setSession(null);
    setSigningOut(false);
  }

  if (!activeClient) {
    return (
      <section className="classroom-setup-gate">
        <span className="setup-gate-icon" aria-hidden="true">
          <Cable />
        </span>
        <p className="eyebrow">內容治理安全閘門</p>
        <h1>題庫治理後端尚未連線</h1>
        <p>
          專用 Supabase 專案與治理 migration 完成後，才會開放真人複核；目前不會用本機資料假裝已通過審查。
        </p>
        <div className="setup-gate-note">
          <ShieldAlert aria-hidden="true" />
          <span>所有複核、發布、爭議與退役紀錄都必須由伺服器保存。</span>
        </div>
      </section>
    );
  }

  if (checkingSession) {
    return <p className="loading-state" role="status">正在確認複核者登入狀態…</p>;
  }

  if (!session || session.user.is_anonymous) {
    return (
      <form className="teacher-login-card" onSubmit={sendMagicLink}>
        <span className="setup-gate-icon" aria-hidden="true">
          <KeyRound />
        </span>
        <p className="eyebrow">核准複核者登入</p>
        <h1>用已核准的工作信箱登入</h1>
        <p>只有通過身分審核的英語教師、內容編輯或管理員能進入對應的治理工作區。</p>
        <label className="classroom-field">
          <span>複核者電子郵件</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="primary-button" type="submit">
          寄送安全登入連結
        </button>
        {magicLinkSent ? (
          <p className="login-success" role="status">
            <MailCheck aria-hidden="true" />登入連結已寄出，請回到信箱點開。
          </p>
        ) : null}
        {message ? (
          <p className="inline-form-alert" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    );
  }

  if (checkingProfile || (!profile && !message)) {
    return <p className="loading-state" role="status">正在確認題庫治理角色…</p>;
  }

  if (message && !profile) {
    return (
      <section className="classroom-setup-gate">
        <h1>題庫治理工作區暫時無法使用</h1>
        <p>{message}</p>
        <button
          className="secondary-button"
          disabled={signingOut}
          onClick={() => void signOut()}
          type="button"
        >
          {signingOut ? "登出中…" : "登出題庫治理"}
        </button>
      </section>
    );
  }

  if (!profile || profile.approvalStatus !== "approved") {
    return (
      <section className="classroom-setup-gate">
        <h1>題庫治理身分尚未核准</h1>
        <p>{message ?? "請由系統管理員確認你的角色與核准狀態。"}</p>
        <button
          className="secondary-button"
          disabled={signingOut}
          onClick={() => void signOut()}
          type="button"
        >
          {signingOut ? "登出中…" : "登出題庫治理"}
        </button>
      </section>
    );
  }

  if (profile.role === "content_editor" || profile.role === "administrator") {
    return (
      <QuestionManagementWorkspace
        client={activeClient}
        displayName={profile.displayName}
        onSignOut={signOut}
        role={profile.role}
      />
    );
  }

  if (loadingQueue && queue.length === 0) {
    return <p className="loading-state" role="status">正在載入凍結版本與複核證據…</p>;
  }

  if (message) {
    return (
      <section className="classroom-setup-gate">
        <h1>題庫複核工作區暫時無法使用</h1>
        <p>{message}</p>
        <button className="secondary-button" onClick={() => void loadQueue()} type="button">
          重新載入
        </button>
      </section>
    );
  }

  return (
    <section className="question-review-workspace" aria-labelledby="review-workspace-title">
      <header className="split-heading">
        <div>
          <p className="eyebrow">題庫治理・真人四眼複核</p>
          <h1 id="review-workspace-title">題庫複核工作區</h1>
          <p>逐題檢查英文、答案、解析、提示、資產、授權與年齡適切性。</p>
        </div>
        <div className="governance-session-controls">
          <strong>{`${profile.displayName}・英語教師`}</strong>
          <span className="review-queue-count">待我複核 {queue.length} 題</span>
          <button
            className="secondary-button"
            disabled={signingOut}
            onClick={() => void signOut()}
            type="button"
          >
            {signingOut ? "登出中…" : "登出題庫治理"}
          </button>
        </div>
      </header>

      {queue.length === 0 ? (
        <section className="review-empty-state">
          <Inbox aria-hidden="true" />
          <h2>目前沒有待你複核的題目</h2>
          <p>可能是佇列已清空，或你已複核過目前所有凍結版本。</p>
        </section>
      ) : (
        <div className="question-review-list">
          {queue.map((item) => (
            <QuestionReviewCard item={item} key={`${item.id}-${item.version}`} onSubmit={submitReview} />
          ))}
        </div>
      )}
      {disputeLoadError ? (
        <p className="inline-form-alert" role="alert">{disputeLoadError}</p>
      ) : null}
      <QuestionDisputePanel
        items={disputeCandidates}
        onSubmit={async ({ questionId, questionVersion, note }) => {
          await reportQuestionDisputeWithSupabase(
            activeClient,
            questionId,
            questionVersion,
            note,
          );
          await loadDisputeCandidates();
        }}
      />
    </section>
  );
}
