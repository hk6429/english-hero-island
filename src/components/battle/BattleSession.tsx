"use client";

import {
  ArrowRight,
  CheckCircle2,
  Flame,
  HandHeart,
  Lightbulb,
  Shield,
  Swords,
} from "lucide-react";
import { useMemo, useState } from "react";
import { projectBattle } from "@/domain/battle/project-battle";
import { createLearningEvent } from "@/domain/learning/create-learning-event";
import type { LearningOutcome } from "@/domain/learning/types";
import type { Question } from "@/domain/questions/question-schema";
import { calculateXp } from "@/domain/rewards/calculate-xp";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { HINT_TOOLS } from "@/features/adventure/content-map";
import { AudioControls } from "@/components/question/AudioControls";
import { QuestionScene } from "@/components/question/QuestionScene";
import { ProgressMeter } from "@/components/ui/ProgressMeter";

type Feedback = Readonly<{
  outcome: LearningOutcome;
  message: string;
  explanation: string;
  xp: number;
  complete: boolean;
}>;

function taipeiStudyDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function outcomeMessage(outcome: LearningOutcome): string {
  switch (outcome) {
    case "independent_correct":
      return "暴擊成功：這題是第一次獨立答對。";
    case "assisted_correct":
      return "線索有幫上忙：你已經把方法接起來了。";
    case "rescued":
      return "夥伴協力成功：完成救援後的再次嘗試。";
    case "pending_support":
      return "這一小段先放進修煉佇列，下次會換一個更清楚的線索。";
  }
}

export function BattleSession({
  bank,
  onComplete,
}: {
  bank: ReadonlyArray<Question>;
  onComplete: () => void;
}) {
  const { ready, progress, dispatch } = useAdventure();
  const session = progress.activeSession;
  const questionById = useMemo(
    () => new Map(bank.map((question) => [question.id, question])),
    [bank],
  );
  const question = session ? questionById.get(session.questionIds[session.currentIndex]) : undefined;
  const [firstWrongOptionId, setFirstWrongOptionId] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (!ready) {
    return <p className="loading-state">正在找回英雄進度……</p>;
  }

  if (!progress.profile || !session) {
    return (
      <div className="empty-state" role="alert">
        <h2>目前沒有可繼續的回合</h2>
        <p>請回到能力島重新選擇今日任務。</p>
      </div>
    );
  }

  const temporaryShieldLoss = firstWrongOptionId ? 1 : 0;
  const visibleShields = Math.max(0, session.battle.shields - temporaryShieldLoss);
  const selectedTool = HINT_TOOLS.find((tool) => tool.id === session.selectedTool);

  if (feedback) {
    const FeedbackIcon =
      feedback.outcome === "rescued"
        ? HandHeart
        : feedback.outcome === "pending_support"
          ? Shield
          : CheckCircle2;
    const completeLabel =
      session.kind === "diagnostic"
        ? "完成診斷"
        : session.kind === "review"
          ? "查看修煉結果"
          : "查看任務結果";

    return (
      <section className="feedback-card" aria-live="polite" aria-labelledby="feedback-title">
        <span className={`feedback-icon feedback-${feedback.outcome}`} aria-hidden="true">
          <FeedbackIcon />
        </span>
        <p className="eyebrow">本題學習紀錄</p>
        <h2 id="feedback-title">{feedback.message}</h2>
        <div className="explanation-box">
          <strong>方法整理</strong>
          <p>{feedback.explanation}</p>
        </div>
        <p className="xp-earned">本題獲得 {feedback.xp} XP</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            if (feedback.complete) {
              onComplete();
              return;
            }
            setFirstWrongOptionId(null);
            setHintsUsed(0);
            setHintVisible(false);
            setFeedback(null);
          }}
        >
          {feedback.complete ? completeLabel : "前往下一題"}
          <ArrowRight aria-hidden="true" />
        </button>
      </section>
    );
  }

  if (!question) {
    return (
      <div className="empty-state" role="alert">
        <h2>這一題暫時無法載入</h2>
        <p>作答紀錄仍保留，請回到能力島重新開啟任務。</p>
      </div>
    );
  }

  const isBoss = question.purpose === "boss";

  function showHint() {
    if (!hintVisible) {
      setHintsUsed((count) => count + 1);
      setHintVisible(true);
    }
  }

  function finishAnswer(selectedOptionId: string, rescueVariantCorrect: boolean) {
    if (!session || !question || !progress.profile) return;

    const now = new Date();
    const event = createLearningEvent({
      eventId: crypto.randomUUID(),
      studentId: `local-grade-${progress.profile.grade}`,
      sessionId: session.id,
      occurredAt: now.toISOString(),
      studyDate: taipeiStudyDate(now),
      question: {
        id: question.id,
        version: question.version,
        microSkill: question.microSkill,
        variantGroup: question.variantGroup,
        correctOptionId: question.correctOptionId,
      },
      response: {
        firstSelectedOptionId: firstWrongOptionId ?? selectedOptionId,
        hintsUsed,
        rescueVariantCorrect,
      },
    });
    const award = calculateXp(event, progress.events);
    const battleBeforeProjection = firstWrongOptionId && event.outcome === "rescued"
      ? {
          ...session.battle,
          shields: Math.max(0, session.battle.shields - 1),
        }
      : session.battle;
    const projected = projectBattle(battleBeforeProjection, event);
    const nextIndex = session.currentIndex + 1;
    const nextQuestion = questionById.get(session.questionIds[nextIndex]);
    const nextSession = {
      ...session,
      currentIndex: nextIndex,
      phase:
        nextQuestion?.purpose === "boss"
          ? ("boss" as const)
          : nextQuestion?.purpose === "review"
            ? ("review" as const)
            : session.phase,
      hintsUsed: 0,
      battle: {
        armor: projected.armor,
        shields: projected.shields,
        combo: projected.combo,
        rescueActive: projected.rescueActive,
      },
      outcomes: [...session.outcomes, event.outcome],
    };

    dispatch({
      type: "record_question",
      event,
      xp: award.total,
      outcome: event.outcome,
      nextSession,
    });
    setFeedback({
      outcome: event.outcome,
      message: outcomeMessage(event.outcome),
      explanation: question.explanation,
      xp: award.total,
      complete: nextIndex >= session.questionIds.length,
    });
  }

  function selectOption(optionId: string) {
    if (!question) return;
    const correct = optionId === question.correctOptionId;

    if (correct) {
      finishAnswer(optionId, firstWrongOptionId !== null);
      return;
    }

    if (!firstWrongOptionId) {
      setFirstWrongOptionId(optionId);
      setHintsUsed((count) => Math.max(1, count));
      setHintVisible(true);
      return;
    }

    finishAnswer(optionId, false);
  }

  return (
    <section className="battle-layout" aria-labelledby="question-title">
      <div className="battle-topline">
        <div className="battle-stat" aria-label={`還有 ${visibleShields} 格專注護盾`}>
          <Shield aria-hidden="true" />
          <span>護盾 {visibleShields}／3</span>
        </div>
        <div className="battle-stat" aria-label={`目前連擊 ${session.battle.combo}`}>
          <Flame aria-hidden="true" />
          <span>連擊 {session.battle.combo}／3</span>
        </div>
      </div>

      <ProgressMeter
        label={session.kind === "diagnostic" ? "診斷進度" : "Boss 護甲"}
        value={session.currentIndex}
        max={session.questionIds.length}
        tone={isBoss ? "gold" : "ocean"}
      />

      <div className={`question-card ${isBoss ? "boss-question" : ""}`}>
        <div className="question-meta">
          <span>
            第 {session.currentIndex + 1} 題／共 {session.questionIds.length} 題
          </span>
          {isBoss ? (
            <span className="boss-badge">
              <Swords aria-hidden="true" />
              Boss 變式題
            </span>
          ) : null}
        </div>

        {question.audio ? <AudioControls transcript={question.audio.transcript} /> : null}
        {question.image ? <QuestionScene src={question.image.src} alt={question.image.alt} /> : null}

        <h1 id="question-title" className="question-prompt">
          {question.prompt}
        </h1>

        {firstWrongOptionId ? (
          <div className="support-callout" role="status">
            <Shield aria-hidden="true" />
            <div>
              <strong>護盾擋住了這一下，再用一個線索試試看。</strong>
              {visibleShields === 0 ? <p>專注護盾歸零，夥伴已啟動救援教學；進度不會消失。</p> : null}
            </div>
          </div>
        ) : null}

        {hintVisible ? (
          <div className="hint-card" role="status">
            <Lightbulb aria-hidden="true" />
            <div>
              <strong>{selectedTool?.name ?? "提示工具"}</strong>
              <p>{question.hints[0]}</p>
            </div>
          </div>
        ) : null}

        <div className="option-grid" aria-label="答案選項">
          {question.options.map((option) => (
            <button
              className={`answer-option ${firstWrongOptionId === option.id ? "option-tried" : ""}`}
              type="button"
              key={option.id}
              disabled={firstWrongOptionId === option.id}
              onClick={() => selectOption(option.id)}
            >
              <span className="option-letter" aria-hidden="true">
                {option.id.toUpperCase()}
              </span>
              <span>{option.text}</span>
            </button>
          ))}
        </div>

        {!hintVisible ? (
          <button className="hint-button" type="button" onClick={showHint}>
            <Lightbulb aria-hidden="true" />
            使用提示工具
          </button>
        ) : null}
      </div>
    </section>
  );
}
