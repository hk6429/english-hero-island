"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, HandHeart, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AudioControls } from "@/components/question/AudioControls";
import { QuestionScene } from "@/components/question/QuestionScene";
import type {
  ClassroomSupportEvidenceStore,
  ClassroomSupportScope,
} from "@/infrastructure/classroom/ClassroomSupportEvidenceStore";
import { IndexedDbClassroomSupportEvidenceStore } from "@/infrastructure/classroom/IndexedDbClassroomSupportEvidenceStore";
import { IndexedDbPendingSubmissionStore } from "@/infrastructure/classroom/IndexedDbPendingSubmissionStore";
import { MemoryClassroomSupportEvidenceStore } from "@/infrastructure/classroom/MemoryClassroomSupportEvidenceStore";
import { MemoryPendingSubmissionStore } from "@/infrastructure/classroom/MemoryPendingSubmissionStore";
import type {
  PendingClassroomSubmission,
  PendingClassroomSubmissionStore,
} from "@/infrastructure/classroom/PendingClassroomSubmissionStore";
import {
  getStudentActivityQuestionsWithSupabase,
  submitClassroomResponseWithSupabase,
  type ClassroomStudentQuestion,
  type SubmittedClassroomResponse,
} from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  client: SupabaseClient;
  activityId: string;
  participantId: string;
  pendingStore?: PendingClassroomSubmissionStore;
  supportStore?: ClassroomSupportEvidenceStore;
}>;

const OFFLINE_NOTICE = "答案已安全保存在這台裝置，恢復連線後會自動送出。";

function createDefaultPendingStore(): PendingClassroomSubmissionStore {
  if (typeof indexedDB === "undefined") {
    return new MemoryPendingSubmissionStore();
  }
  return new IndexedDbPendingSubmissionStore();
}

function createDefaultSupportStore(): ClassroomSupportEvidenceStore {
  if (typeof indexedDB === "undefined") {
    return new MemoryClassroomSupportEvidenceStore();
  }
  return new IndexedDbClassroomSupportEvidenceStore();
}

function supportScope(
  activityId: string,
  participantId: string,
  question: ClassroomStudentQuestion,
): ClassroomSupportScope {
  return {
    activityId,
    participantId,
    questionId: question.id,
    questionVersion: question.version,
  };
}

function normalizeQueuedHintsUsed(submission: PendingClassroomSubmission): 0 | 1 {
  if (submission.hintsUsed === 0 || submission.hintsUsed === 1) {
    return submission.hintsUsed;
  }
  return submission.question.modality === "audio" ? 1 : 0;
}

export function ClassroomMissionSession({
  client,
  activityId,
  participantId,
  pendingStore,
  supportStore,
}: Props) {
  const [submissionStore] = useState<PendingClassroomSubmissionStore>(
    () => pendingStore ?? createDefaultPendingStore(),
  );
  const [supportEvidenceStore] = useState<ClassroomSupportEvidenceStore>(
    () => supportStore ?? createDefaultSupportStore(),
  );
  const [questions, setQuestions] = useState<ReadonlyArray<ClassroomStudentQuestion>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<SubmittedClassroomResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [supportEvidenceReady, setSupportEvidenceReady] = useState(false);
  const [savingSupportEvidence, setSavingSupportEvidence] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] =
    useState<PendingClassroomSubmission | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [retryRevision, setRetryRevision] = useState(0);
  const syncInFlightEventId = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      getStudentActivityQuestionsWithSupabase(client, activityId),
      submissionStore.list(activityId, participantId),
    ]).then(async ([questionResult, pendingResult]) => {
      if (!active) return;

      const loadedQuestions =
        questionResult.status === "fulfilled" ? questionResult.value : [];
      const queuedSubmission =
        pendingResult.status === "fulfilled" ? pendingResult.value[0] : undefined;

      if (queuedSubmission) {
        const otherQuestions = loadedQuestions.filter(
          (question) =>
            question.id !== queuedSubmission.question.id ||
            question.version !== queuedSubmission.question.version,
        );
        setQuestions([queuedSubmission.question, ...otherQuestions]);
        setCurrentIndex(0);
        setPendingSubmission(queuedSubmission);
        setSelectedOptionId(queuedSubmission.selectedOptionId);
        setHintsUsed(normalizeQueuedHintsUsed(queuedSubmission));
        setSupportEvidenceReady(true);
        setSyncNotice(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? OFFLINE_NOTICE
            : "已找回尚未送出的答案，正在重新送出…",
        );
        setError(
          questionResult.status === "rejected"
            ? "新題目暫時無法更新，但上次保留的答案仍可安全重送。"
            : null,
        );
      } else {
        setQuestions(loadedQuestions);
        const firstQuestion = loadedQuestions[0];
        let supportRestoreFailed = false;
        if (firstQuestion) {
          try {
            const restoredHints = await supportEvidenceStore.get(
              supportScope(activityId, participantId, firstQuestion),
            );
            if (!active) return;
            setHintsUsed(restoredHints);
          } catch {
            if (!active) return;
            setHintsUsed(firstQuestion.modality === "audio" ? 1 : 0);
            supportRestoreFailed = true;
          }
        }
        setSupportEvidenceReady(true);
        if (pendingResult.status === "rejected") {
          setError("無法讀取這台裝置上的答案佇列，請先不要關閉頁面並通知老師。");
        } else if (questionResult.status === "rejected") {
          setError(
            questionResult.reason instanceof Error
              ? questionResult.reason.message
              : "課堂題目載入失敗。",
          );
        } else if (supportRestoreFailed) {
          setError("無法讀取文字輔助紀錄；這題會保守視為已使用輔助。");
        } else {
          setError(
            loadedQuestions.length === 0 ? "這場活動目前沒有可作答題目。" : null,
          );
        }
      }

      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [
    activityId,
    client,
    participantId,
    submissionStore,
    supportEvidenceStore,
  ]);

  useEffect(() => {
    function retryWhenOnline() {
      setSyncNotice("網路已恢復，正在送出保留的答案…");
      setRetryRevision((revision) => revision + 1);
    }
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, []);

  useEffect(() => {
    if (loading || feedback || !pendingSubmission) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    if (syncInFlightEventId.current === pendingSubmission.deviceEventId) return;
    syncInFlightEventId.current = pendingSubmission.deviceEventId;
    const submission = pendingSubmission;

    void Promise.resolve().then(async () => {
      if (!mounted.current) return;
      setSubmitting(true);
      setError(null);
      setSyncNotice("答案已保存在裝置，正在由伺服器判分…");

      try {
        const result = await submitClassroomResponseWithSupabase(client, {
          activityId: submission.activityId,
          participantId: submission.participantId,
          questionId: submission.question.id,
          questionVersion: submission.question.version,
          selectedOptionId: submission.selectedOptionId,
          hintsUsed: normalizeQueuedHintsUsed(submission),
          deviceEventId: submission.deviceEventId,
        });
        await submissionStore.remove(submission.deviceEventId);
        if (!mounted.current) return;
        setFeedback(result);
        setPendingSubmission(null);
        setSyncNotice(null);
      } catch (cause) {
        if (!mounted.current) return;
        setError(cause instanceof Error ? cause.message : "答案暫時無法送達。");
        setSyncNotice("答案仍安全保存在這台裝置；可按下重送，或等待網路恢復。");
      } finally {
        if (syncInFlightEventId.current === submission.deviceEventId) {
          syncInFlightEventId.current = null;
        }
        if (mounted.current) setSubmitting(false);
      }
    });
  }, [client, feedback, loading, pendingSubmission, retryRevision, submissionStore]);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (
      loading ||
      feedback ||
      pendingSubmission ||
      !currentQuestion ||
      supportEvidenceReady
    ) {
      return;
    }

    let active = true;
    void supportEvidenceStore
      .get(supportScope(activityId, participantId, currentQuestion))
      .then((restoredHints) => {
        if (!active) return;
        setHintsUsed(restoredHints);
        setSupportEvidenceReady(true);
      })
      .catch(() => {
        if (!active) return;
        setHintsUsed(currentQuestion.modality === "audio" ? 1 : 0);
        setError("無法讀取文字輔助紀錄；這題會保守視為已使用輔助。");
        setSupportEvidenceReady(true);
      });
    return () => {
      active = false;
    };
  }, [
    activityId,
    currentQuestion,
    feedback,
    loading,
    participantId,
    pendingSubmission,
    supportEvidenceReady,
    supportEvidenceStore,
  ]);

  async function markTranscriptRevealed() {
    if (!currentQuestion || savingSupportEvidence) return;
    setHintsUsed(1);
    setSavingSupportEvidence(true);
    try {
      await supportEvidenceStore.markTranscriptRevealed(
        supportScope(activityId, participantId, currentQuestion),
      );
    } catch {
      setError(
        "文字輔助已開啟，但無法保存重整復原標記；本次作答仍會保守記為使用輔助。",
      );
    } finally {
      setSavingSupportEvidence(false);
    }
  }

  async function submitOption(optionId: string) {
    if (
      !currentQuestion ||
      feedback ||
      submitting ||
      pendingSubmission ||
      !supportEvidenceReady ||
      savingSupportEvidence
    ) {
      return;
    }

    const submission: PendingClassroomSubmission = {
      activityId,
      participantId,
      deviceEventId: crypto.randomUUID(),
      selectedOptionId: optionId,
      hintsUsed,
      queuedAt: new Date().toISOString(),
      question: currentQuestion,
    };

    setSelectedOptionId(optionId);
    setSubmitting(true);
    setError(null);
    setSyncNotice("正在把答案安全保存在這台裝置…");

    try {
      await submissionStore.put(submission);
      setPendingSubmission(submission);
      void supportEvidenceStore
        .clear(supportScope(activityId, participantId, currentQuestion))
        .catch(() => undefined);
      setSyncNotice(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? OFFLINE_NOTICE
          : "答案已安全保存，準備送出…",
      );
    } catch (cause) {
      setSelectedOptionId(null);
      setSyncNotice(null);
      setError(
        cause instanceof Error
          ? `答案尚未送出：${cause.message}`
          : "瀏覽器無法安全保存答案，因此尚未送出；請保留頁面並通知老師。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function continueMission() {
    if (!currentQuestion) return;
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setFeedback(null);
    setSelectedOptionId(null);
    setHintsUsed(0);
    setSupportEvidenceReady(false);
    setError(null);
    setPendingSubmission(null);
    setSyncNotice(null);
  }

  function retryPendingSubmission() {
    setRetryRevision((revision) => revision + 1);
  }

  if (loading) {
    return <p className="loading-state">正在載入合作題目…</p>;
  }

  if (finished) {
    return (
      <section className="classroom-mission-finished">
        <span className="waiting-glyph" aria-hidden="true">
          <CheckCircle2 />
        </span>
        <p className="eyebrow">合作任務完成</p>
        <h2>你完成了這次合作貢獻</h2>
        <p>
          每個人的作答都已變成全班共同修復；如果有需要協助的題目，老師會從看板靠近你。
        </p>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <p className="inline-form-alert" role="alert">
        {error ?? "這場活動目前沒有可作答題目。"}
      </p>
    );
  }

  if (feedback) {
    const isIndependentCorrect = feedback.outcome === "independent_correct";
    const isAssistedCorrect = feedback.outcome === "assisted_correct";
    const isCorrect = isIndependentCorrect || isAssistedCorrect;
    const correctOption = currentQuestion.options.find(
      (option) => option.id === feedback.correctOptionId,
    );

    return (
      <section className="classroom-feedback-card" aria-live="polite">
        <span
          className={`classroom-feedback-icon ${isCorrect ? "feedback-good" : "feedback-support"}`}
          aria-hidden="true"
        >
          {isIndependentCorrect ? <CheckCircle2 /> : <HandHeart />}
        </span>
        <h2>
          {isIndependentCorrect
            ? "你修復了一格能力島！"
            : isAssistedCorrect
              ? "你用文字輔助完成了這題"
              : "這題先標記為需要協助"}
        </h2>
        {!isCorrect && correctOption ? (
          <p className="correct-answer-note">這題的正確答案是：{correctOption.text}</p>
        ) : null}
        <div className="explanation-box">
          <strong>作答後解析</strong>
          <p>{feedback.explanation}</p>
        </div>
        <div className="shared-story-stats" role="group" aria-label="更新後的全班共同進度">
          <strong>全班已修復 {feedback.sharedRepairedPoints} 格</strong>
          <span>Boss 護甲 {feedback.sharedBossArmor}</span>
        </div>
        <button className="primary-button" onClick={continueMission} type="button">
          {currentIndex >= questions.length - 1 ? "完成合作任務" : "前往下一題"}
        </button>
      </section>
    );
  }

  const encodedTranscript = currentQuestion.audio?.src.startsWith("tts:")
    ? currentQuestion.audio.src.slice(4)
    : null;

  return (
    <section className="classroom-question-card">
      <div className="classroom-question-meta">
        <span>
          第 {currentIndex + 1}／{questions.length} 題
        </span>
        <span className="classroom-coop-chip">
          <Swords aria-hidden="true" />全班合作
        </span>
      </div>

      {encodedTranscript ? (
        <AudioControls
          transcript={decodeURIComponent(encodedTranscript)}
          onRevealTranscript={() => void markTranscriptRevealed()}
        />
      ) : currentQuestion.audio ? (
        <audio controls preload="none" src={currentQuestion.audio.src}>
          你的瀏覽器不支援音訊播放。
        </audio>
      ) : null}

      {currentQuestion.image ? (
        <QuestionScene src={currentQuestion.image.src} alt={currentQuestion.image.alt} />
      ) : null}

      <h2 className="classroom-question-prompt">{currentQuestion.prompt}</h2>
      <div className="option-grid">
        {currentQuestion.options.map((option) => {
          return (
            <button
              aria-pressed={selectedOptionId === option.id}
              className={`answer-option ${selectedOptionId === option.id ? "answer-option-pending" : ""}`}
              disabled={
                submitting ||
                pendingSubmission !== null ||
                !supportEvidenceReady ||
                savingSupportEvidence
              }
              key={option.id}
              onClick={() => void submitOption(option.id)}
              type="button"
            >
              <span className="option-letter" aria-hidden="true">
                {option.id.toUpperCase()}
              </span>
              {option.text}
            </button>
          );
        })}
      </div>
      {syncNotice ? (
        <p className="classroom-sync-notice" role="status">
          {syncNotice}
        </p>
      ) : null}
      {pendingSubmission && !submitting ? (
        <button
          className="secondary-button classroom-retry-button"
          onClick={retryPendingSubmission}
          type="button"
        >
          立即重送保留的答案
        </button>
      ) : null}
      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
