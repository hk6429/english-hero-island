"use client";

import {
  ArrowRight,
  CheckCircle2,
  Flame,
  HandHeart,
  Lightbulb,
  MapPinned,
  Shield,
  Swords,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { projectBattle } from "@/domain/battle/project-battle";
import { buildHintScaffold } from "@/domain/hints/build-hint-scaffold";
import { createLearningEvent } from "@/domain/learning/create-learning-event";
import type { LearningOutcome } from "@/domain/learning/types";
import type { Question } from "@/domain/questions/question-schema";
import { calculateXp } from "@/domain/rewards/calculate-xp";
import { buildRescue } from "@/domain/session-builder/build-rescue";
import { deriveBossMove } from "@/domain/story/derive-boss-move";
import { seededIndex } from "@/domain/story/seeded-pick";
import { shuffledOptions } from "@/domain/questions/shuffle-options";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { HINT_TOOLS } from "@/features/adventure/content-map";
import { AudioControls } from "@/components/question/AudioControls";
import { QuestionScene } from "@/components/question/QuestionScene";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import type { HintTool, MissionRoute } from "@/infrastructure/progress/progress-types";
import styles from "./BattleSession.module.css";

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
      return "夥伴協力成功：救援任務完成，專注護盾回到 1 格。";
    case "pending_support":
      return "這一小段先放進修煉佇列，下次會換一個更清楚的線索。";
  }
}

function growthNote(outcome: LearningOutcome): string {
  switch (outcome) {
    case "independent_correct":
      return "成長紀錄：獨立完成一次，精熟證據又多了一筆。";
    case "assisted_correct":
      return "成長紀錄：會挑線索、會用線索，這本身就是能力。";
    case "rescued":
      return "成長紀錄：夥伴陪你把方法接回來，最後一步是你自己完成的。";
    case "pending_support":
      return "成長紀錄：先把位置記下來，下次用更清楚的線索再走一次。";
  }
}

const storyTrailMoments = [
  "一道星光落在前方，照出藏在題目裡的第一個線索。",
  "島嶼風鈴響了一聲，提醒你換一個角度觀察。",
  "遠處地圖浮出新記號，下一步仍由你決定。",
  "Boss 留下的腳印變清楚了，但方法仍比速度重要。",
  "最後一段道路發亮，準備把方法帶進 Boss 回合。",
  "路線在終點交會，你用自己的方式走完了同一份能力。",
] as const;

const steadyBridgeMoments = [
  "橋頭的木牌寫著出發口訣：先圈出題目要找什麼，再開始看選項。",
  "第二塊橋板掛著小燈籠：把關鍵字唸一次，聽聽哪個選項接得最順。",
  "橋中央的望遠鏡幫你放大：一次只核對一個條件，符合了才往前走。",
  "海風吹過橋面：先刪掉明顯不合的選項，再從剩下的慢慢挑。",
  "接近對岸的繩結提醒你：回頭再檢查一次，確定條件全部都符合。",
  "踏上對岸的石階：把這一路用過的方法說給自己聽，帶進最後的挑戰。",
] as const;

function routeMoment(
  route: MissionRoute,
  index: number,
  sessionSeed: string,
): Readonly<{ title: string; detail: string }> {
  const step = index + 1;
  if (route === "story-trail") {
    const offset = seededIndex(sessionSeed, storyTrailMoments.length);
    return {
      title: `探索徑・故事線索 ${step}`,
      detail: storyTrailMoments[(offset + index) % storyTrailMoments.length],
    };
  }
  return {
    title: `穩步橋・方法步驟 ${step}`,
    detail: steadyBridgeMoments[index % steadyBridgeMoments.length],
  };
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
  const [hintToolOverride, setHintToolOverride] = useState<HintTool | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rescueStep, setRescueStep] = useState<"teach" | "quiz">("teach");
  const [rescueFirstTryId, setRescueFirstTryId] = useState<string | null>(null);
  const [rescueTriedIds, setRescueTriedIds] = useState<readonly string[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (feedback) {
      feedbackRef.current?.focus();
      return;
    }
    if (hintVisible) hintRef.current?.focus();
  }, [feedback, hintVisible]);

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
  const activeHintTool = hintToolOverride ?? session.selectedTool ?? "word-bridge";
  const selectedTool = HINT_TOOLS.find((tool) => tool.id === activeHintTool);
  const selectedRoute = session.selectedRoute ?? null;
  const route = selectedRoute
    ? routeMoment(selectedRoute, session.currentIndex, session.id)
    : null;

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
      <section
        aria-live="polite"
        aria-labelledby="feedback-title"
        className={`feedback-card ${styles.feedbackEnter}`}
        ref={feedbackRef}
        tabIndex={-1}
      >
        <span className={`feedback-icon feedback-${feedback.outcome}`} aria-hidden="true">
          <FeedbackIcon />
        </span>
        <p className="eyebrow">本題學習紀錄</p>
        <h2 id="feedback-title">{feedback.message}</h2>
        <div className="explanation-box">
          <strong>方法整理</strong>
          <p>{feedback.explanation}</p>
        </div>
        <p className={styles.growthNote}>{growthNote(feedback.outcome)}</p>
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
            setHintToolOverride(null);
            setRescueStep("teach");
            setRescueFirstTryId(null);
            setRescueTriedIds([]);
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
  const bossMove = isBoss ? deriveBossMove(`${session.id}:${question.id}`) : null;
  const hintScaffold = buildHintScaffold(question, activeHintTool);

  function showHint() {
    if (!hintVisible) {
      setHintsUsed((count) => count + 1);
      setHintVisible(true);
    }
  }

  function finishAnswer(selectedOptionId: string) {
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
        finalSelectedOptionId: selectedOptionId,
        hintsUsed,
        toolUsed: hintVisible ? activeHintTool : null,
        rescueVariantCorrect: false,
      },
    });
    const award = calculateXp(event, progress.events);
    const projected = projectBattle(session.battle, event);
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
      explanation: hintVisible
        ? `${question.explanation} ${hintScaffold.feedback}`
        : question.explanation,
      xp: award.total,
      complete: nextIndex >= session.questionIds.length,
    });
  }

  function selectOption(optionId: string) {
    if (!question) return;
    const correct = optionId === question.correctOptionId;

    if (correct) {
      finishAnswer(optionId);
      return;
    }

    if (!firstWrongOptionId) {
      setFirstWrongOptionId(optionId);
      setHintsUsed((count) => Math.max(1, count));
      setHintVisible(true);
      return;
    }

    finishAnswer(optionId);
  }

  function finishRescue(selectedOptionId: string, rescueQuestion: Question, rescueFeedback: string) {
    if (!session || !progress.profile) return;

    const now = new Date();
    const event = createLearningEvent({
      eventId: crypto.randomUUID(),
      studentId: `local-grade-${progress.profile.grade}`,
      sessionId: session.id,
      occurredAt: now.toISOString(),
      studyDate: taipeiStudyDate(now),
      question: {
        id: rescueQuestion.id,
        version: rescueQuestion.version,
        microSkill: rescueQuestion.microSkill,
        variantGroup: rescueQuestion.variantGroup,
        correctOptionId: rescueQuestion.correctOptionId,
      },
      response: {
        firstSelectedOptionId: rescueFirstTryId ?? selectedOptionId,
        finalSelectedOptionId: selectedOptionId,
        hintsUsed: 1 + rescueTriedIds.length,
        toolUsed: activeHintTool,
        rescueVariantCorrect: true,
      },
    });
    const award = calculateXp(event, progress.events);
    const nextSession = {
      ...session,
      battle: {
        ...session.battle,
        shields: 1,
        rescueActive: false,
      },
    };

    dispatch({
      type: "record_question",
      event,
      xp: award.total,
      outcome: event.outcome,
      nextSession,
    });
    setRescueStep("teach");
    setRescueFirstTryId(null);
    setRescueTriedIds([]);
    setFeedback({
      outcome: event.outcome,
      message: outcomeMessage(event.outcome),
      explanation: `${rescueQuestion.explanation} ${rescueFeedback}`,
      xp: award.total,
      complete: false,
    });
  }

  function selectRescueOption(optionId: string, rescueQuestion: Question, rescueFeedback: string) {
    if (optionId === rescueQuestion.correctOptionId) {
      finishRescue(optionId, rescueQuestion, rescueFeedback);
      return;
    }

    setRescueFirstTryId((current) => current ?? optionId);
    setRescueTriedIds((tried) => (tried.includes(optionId) ? tried : [...tried, optionId]));
  }

  function applyRescueTeachingOnly() {
    if (!session) return;

    dispatch({
      type: "apply_rescue_support",
      nextSession: {
        ...session,
        battle: {
          ...session.battle,
          shields: 1,
          rescueActive: false,
        },
      },
    });
    setRescueStep("teach");
    setRescueFirstTryId(null);
    setRescueTriedIds([]);
  }

  if (session.battle.rescueActive) {
    const previousQuestion =
      session.currentIndex > 0
        ? questionById.get(session.questionIds[session.currentIndex - 1])
        : undefined;
    const rescueSkill = session.microSkill ?? previousQuestion?.microSkill ?? question.microSkill;
    const rescueQuestion = buildRescue({
      grade: progress.profile.grade,
      microSkill: rescueSkill,
      bank,
      contentMode: "pilot",
      excludeQuestionIds: session.questionIds,
      seed: session.id,
    });
    const rescueScaffold = buildHintScaffold(rescueQuestion ?? question, activeHintTool);

    return (
      <section className="battle-layout" aria-labelledby="rescue-title">
        <div className="battle-topline">
          <div className="battle-stat">
            <span className={styles.pips} aria-hidden="true">
              {[0, 1, 2].map((slot) => (
                <Shield key={slot} className={styles.pipOff} />
              ))}
            </span>
            <span>護盾 0／3</span>
          </div>
          <div className="battle-stat">
            <HandHeart aria-hidden="true" />
            <span>夥伴救援中</span>
          </div>
        </div>

        <div className="question-card rescue-card">
          <p className="eyebrow">夥伴救援教學</p>
          <h1 id="rescue-title">夥伴來了，陪你把方法接回來</h1>
          <p className={styles.bossCalm}>
            夥伴陪跑不計時，也不會拿走任何收穫。先看夥伴示範方法，再一起把專注護盾接回來。
          </p>

          <div aria-label="夥伴示範" className="hint-card" role="status">
            <Lightbulb aria-hidden="true" />
            <div>
              <strong>{selectedTool?.name ?? "提示工具"}</strong>
              {selectedTool ? <p className="hint-strategy">{selectedTool.description}</p> : null}
              <p>{rescueScaffold.clue}</p>
            </div>
          </div>

          {rescueStep === "teach" ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (rescueQuestion) {
                  setRescueStep("quiz");
                  return;
                }
                applyRescueTeachingOnly();
              }}
            >
              {rescueQuestion ? "我準備好了，開始救援任務" : "把方法帶回挑戰"}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : rescueQuestion ? (
            <>
              {rescueQuestion.audio ? (
                <AudioControls
                  transcript={rescueQuestion.audio.transcript}
                  onRevealTranscript={() => undefined}
                />
              ) : null}
              {rescueQuestion.image ? (
                <QuestionScene src={rescueQuestion.image.src} alt={rescueQuestion.image.alt} />
              ) : null}

              <h2 className="question-prompt">{rescueQuestion.prompt}</h2>

              {rescueTriedIds.length > 0 ? (
                <div className="support-callout" role="status">
                  <Shield aria-hidden="true" />
                  <div>
                    <strong>換一個線索再試，夥伴就在旁邊陪你。</strong>
                  </div>
                </div>
              ) : null}

              <div className="option-grid" role="group" aria-label="救援題選項">
                {shuffledOptions(rescueQuestion, `${session.id}:rescue`).map((option) => (
                  <button
                    className={`answer-option ${rescueTriedIds.includes(option.id) ? "option-tried" : ""}`}
                    type="button"
                    key={option.id}
                    disabled={rescueTriedIds.includes(option.id)}
                    onClick={() =>
                      selectRescueOption(option.id, rescueQuestion, rescueScaffold.feedback)
                    }
                  >
                    <span className="option-letter" aria-hidden="true">
                      {option.id.toUpperCase()}
                    </span>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="battle-layout" aria-labelledby="question-title">
      <div className="battle-topline">
        <div className="battle-stat">
          <span className={styles.pips} aria-hidden="true">
            {[0, 1, 2].map((slot) => (
              <Shield key={slot} className={slot < visibleShields ? styles.pipOn : styles.pipOff} />
            ))}
          </span>
          <span>護盾 {visibleShields}／3</span>
        </div>
        <div className="battle-stat">
          <span className={styles.pips} aria-hidden="true">
            {[0, 1, 2].map((slot) => (
              <Flame
                key={slot}
                className={slot < Math.min(3, session.battle.combo) ? styles.comboOn : styles.pipOff}
              />
            ))}
          </span>
          <span>連擊 {session.battle.combo}／3</span>
        </div>
      </div>

      <ProgressMeter
        label={session.kind === "diagnostic" ? "診斷進度" : "Boss 護甲"}
        value={session.currentIndex}
        max={session.questionIds.length}
        tone={isBoss ? "gold" : "ocean"}
      />

      <ol className={styles.stepDots} aria-hidden="true">
        {session.questionIds.map((questionId, index) => (
          <li
            key={questionId}
            className={
              index < session.currentIndex
                ? styles.stepDone
                : index === session.currentIndex
                  ? styles.stepNow
                  : styles.stepNext
            }
          />
        ))}
      </ol>

      {route ? (
        <div className={`route-moment route-${selectedRoute}`} role="status">
          <MapPinned aria-hidden="true" />
          <div>
            <strong>{route.title}</strong>
            <p>{route.detail}</p>
            <small>兩條路使用相同題目、提示與 XP 規則。</small>
          </div>
        </div>
      ) : null}

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

        {isBoss ? (
          <p className={styles.bossCalm}>
            深呼吸——Boss 只是把同一種方法換了裝扮，節奏放慢，方法照舊。
          </p>
        ) : null}

        {question.audio ? (
          <AudioControls
            transcript={question.audio.transcript}
            onRevealTranscript={() => setHintsUsed((count) => Math.max(1, count))}
          />
        ) : null}
        {question.image ? <QuestionScene src={question.image.src} alt={question.image.alt} /> : null}

        {bossMove ? (
          <div className="boss-move-card" role="status">
            <Swords aria-hidden="true" />
            <div>
              <span>Boss 招式</span>
              <strong>{bossMove.name}</strong>
              <p>{bossMove.strategy}</p>
              <small>{bossMove.ruleNotice}</small>
            </div>
          </div>
        ) : null}

        <h1 id="question-title" className="question-prompt">
          {question.prompt}
        </h1>

        {firstWrongOptionId ? (
          <div className="support-callout" role="status">
            <Shield aria-hidden="true" />
            <div>
              <strong>護盾擋住了這一下，再用一個線索試試看。</strong>
              {visibleShields === 0 ? (
                <p>如果這一題還差一步，夥伴會啟動救援教學；進度不會消失。</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {hintVisible ? (
          <div
            aria-label="提示內容"
            className="hint-card"
            ref={hintRef}
            role="status"
            tabIndex={-1}
          >
            <Lightbulb aria-hidden="true" />
            <div>
              <strong>{selectedTool?.name ?? "提示工具"}</strong>
              {selectedTool ? <p className="hint-strategy">{selectedTool.description}</p> : null}
              <p>{hintScaffold.clue}</p>
              <div role="group" aria-label="切換提示工具">
                {HINT_TOOLS.map((tool) => (
                  <button
                    type="button"
                    key={tool.id}
                    aria-label={`切換為${tool.name}`}
                    aria-pressed={tool.id === activeHintTool}
                    onClick={() => {
                      setHintToolOverride(tool.id);
                      dispatch({ type: "choose_tool", tool: tool.id });
                    }}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="option-grid" role="group" aria-label="答案選項">
          {shuffledOptions(question, session.id).map((option) => (
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
