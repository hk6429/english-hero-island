"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, HandHeart, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { AudioControls } from "@/components/question/AudioControls";
import { QuestionScene } from "@/components/question/QuestionScene";
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
}>;

type PendingSubmission = Readonly<{
  questionId: string;
  selectedOptionId: string;
  deviceEventId: string;
}>;

export function ClassroomMissionSession({ client, activityId, participantId }: Props) {
  const [questions, setQuestions] = useState<ReadonlyArray<ClassroomStudentQuestion>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<SubmittedClassroomResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] =
    useState<PendingSubmission | null>(null);

  useEffect(() => {
    let mounted = true;
    void getStudentActivityQuestionsWithSupabase(client, activityId)
      .then((loadedQuestions) => {
        if (mounted) {
          setQuestions(loadedQuestions);
          setError(loadedQuestions.length === 0 ? "這場活動目前沒有可作答題目。" : null);
        }
      })
      .catch((cause) => {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : "課堂題目載入失敗。");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activityId, client]);

  const currentQuestion = questions[currentIndex];

  async function submitOption(optionId: string) {
    if (!currentQuestion || feedback || submitting) return;

    const reusableSubmission = pendingSubmission;
    const deviceEventId =
      reusableSubmission?.questionId === currentQuestion.id &&
      reusableSubmission.selectedOptionId === optionId
        ? reusableSubmission.deviceEventId
        : crypto.randomUUID();

    setPendingSubmission({
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      deviceEventId,
    });
    setSelectedOptionId(optionId);
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitClassroomResponseWithSupabase(client, {
        activityId,
        participantId,
        questionId: currentQuestion.id,
        questionVersion: currentQuestion.version,
        selectedOptionId: optionId,
        deviceEventId,
      });
      setFeedback(result);
      setPendingSubmission(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "答案送出失敗，請再試一次。");
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
    setError(null);
    setPendingSubmission(null);
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
    const correctOption = currentQuestion.options.find(
      (option) => option.id === feedback.correctOptionId,
    );

    return (
      <section className="classroom-feedback-card" aria-live="polite">
        <span
          className={`classroom-feedback-icon ${isIndependentCorrect ? "feedback-good" : "feedback-support"}`}
          aria-hidden="true"
        >
          {isIndependentCorrect ? <CheckCircle2 /> : <HandHeart />}
        </span>
        <h2>
          {isIndependentCorrect
            ? "你修復了一格能力島！"
            : "這題先標記為需要協助"}
        </h2>
        {!isIndependentCorrect && correctOption ? (
          <p className="correct-answer-note">這題的正確答案是：{correctOption.text}</p>
        ) : null}
        <div className="explanation-box">
          <strong>作答後解析</strong>
          <p>{feedback.explanation}</p>
        </div>
        <div className="shared-story-stats" aria-label="更新後的全班共同進度">
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
        <AudioControls transcript={decodeURIComponent(encodedTranscript)} />
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
          const anotherOptionIsPending =
            pendingSubmission !== null && selectedOptionId !== option.id;
          return (
            <button
              className="answer-option"
              disabled={submitting || Boolean(anotherOptionIsPending)}
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
      {submitting ? <p className="field-help">正在由伺服器判分…</p> : null}
      {error ? (
        <p className="inline-form-alert" role="alert">
          {error} 請再按一次剛才的答案，系統會沿用同一筆事件。
        </p>
      ) : null}
    </section>
  );
}
