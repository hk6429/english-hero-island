"use client";

import { ArrowLeft, RotateCcw, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { playableQuestionBank } from "@/content/playable";
import {
  applyAnswer,
  type ArenaState,
  buyInsurance,
  INITIAL_ARENA,
  INSURANCE_COST,
  levelForCorrect,
  multiplierForStreak,
  tierForScore,
} from "@/domain/arena/scoring";
import { shuffle } from "@/domain/self-learning/match-games";
import type { Grade, Question } from "@/domain/questions/question-schema";

const GRADES: Grade[] = [3, 4, 5, 6];
const ROUND_COUNT = 10;
const COMPUTER_ACCURACY = 0.62;

function textQuestionsForGrade(grade: Grade): Question[] {
  return playableQuestionBank.filter(
    (question) =>
      question.grade === grade &&
      question.modality === "text" &&
      question.questionType === "multiple_choice",
  );
}

type Feedback = {
  correct: boolean;
  gain: number;
  penalty: number;
  computerCorrect: boolean;
  computerGain: number;
} | null;

export default function ArenaPage() {
  const [grade, setGrade] = useState<Grade>(3);
  // 初始 pool 用固定順序，讓伺服器與客戶端首次渲染一致（避免 hydration mismatch）；
  // 掛載後再於 effect 內洗牌，屬客戶端事件，不影響 hydration。
  const [pool, setPool] = useState<Question[]>(() =>
    textQuestionsForGrade(3).slice(0, ROUND_COUNT),
  );
  const [round, setRound] = useState(0);
  const [player, setPlayer] = useState<ArenaState>(INITIAL_ARENA);
  const [computer, setComputer] = useState<ArenaState>(INITIAL_ARENA);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // 掛載後洗一次牌，讓每次進場題序不同（客戶端限定，不參與 SSR）。
  useEffect(() => {
    startMatch(grade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = useMemo(() => textQuestionsForGrade(grade), [grade]);
  const current = pool[round];
  const finished = round >= pool.length || pool.length === 0;
  const playerTier = tierForScore(player.score);
  const nextMultiplier = multiplierForStreak(player.streak + 1);

  function startMatch(nextGrade: Grade = grade) {
    setPool(shuffle(textQuestionsForGrade(nextGrade)).slice(0, ROUND_COUNT));
    setRound(0);
    setPlayer(INITIAL_ARENA);
    setComputer(INITIAL_ARENA);
    setPicked(null);
    setFeedback(null);
  }

  function changeGrade(nextGrade: Grade) {
    setGrade(nextGrade);
    startMatch(nextGrade);
  }

  function insure() {
    setPlayer((prev) => buyInsurance(prev));
  }

  function answer(optionId: string) {
    if (picked !== null || !current) {
      return;
    }
    const correct = optionId === current.correctOptionId;
    const playerOutcome = applyAnswer(player, correct);
    // 電腦對手：固定命中率模擬作答，讓學生有一個可追趕的對象（非真人、不排名）。
    const computerCorrect = Math.random() < COMPUTER_ACCURACY;
    const computerOutcome = applyAnswer(computer, computerCorrect);

    setPicked(optionId);
    setPlayer(playerOutcome.state);
    setComputer(computerOutcome.state);
    setFeedback({
      correct,
      gain: playerOutcome.gain,
      penalty: playerOutcome.penalty,
      computerCorrect,
      computerGain: computerOutcome.gain,
    });
  }

  function next() {
    setPicked(null);
    setFeedback(null);
    setRound((prev) => prev + 1);
  }

  const outcome =
    player.score > computer.score ? "win" : player.score < computer.score ? "lose" : "tie";

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・積分挑戰</p>
          <h1>積分挑戰（單人對電腦）</h1>
          <p className="learn-sub">
            答對就得分，連續答對分數翻倍、越答越升級。這是自己跟電腦的練習賽——不排名、不公開、不進成績；答錯只扣遊戲分數，買個護盾就能少扣一點。
          </p>
        </header>

        <div className="grade-picker" role="group" aria-label="選擇年級">
          {GRADES.map((option) => (
            <button
              key={option}
              type="button"
              className={`grade-chip${option === grade ? " grade-chip-active" : ""}`}
              aria-pressed={option === grade}
              onClick={() => changeGrade(option)}
            >
              {option} 年級
            </button>
          ))}
        </div>

        <div className="arena-scoreboard" role="status">
          <div className="arena-score arena-score-me">
            <span className="arena-score-label">你</span>
            <span className="arena-score-value">{player.score}</span>
            <span className="arena-tier">{playerTier.name}・Lv.{levelForCorrect(player.totalCorrect)}</span>
          </div>
          <div className="arena-score arena-score-cpu">
            <span className="arena-score-label">電腦</span>
            <span className="arena-score-value">{computer.score}</span>
            <span className="arena-tier">{tierForScore(computer.score).name}</span>
          </div>
        </div>

        <div className="arena-streak">
          <span className={`arena-combo${player.streak >= 2 ? " arena-combo-hot" : ""}`}>
            <Zap aria-hidden="true" />連對 {player.streak}（下一題 ×{nextMultiplier}）
          </span>
          {player.insured ? (
            <span className="arena-insured">
              <Shield aria-hidden="true" />護盾已啟動
            </span>
          ) : (
            <button
              type="button"
              className="arena-insure-button"
              onClick={insure}
              disabled={finished || player.score < INSURANCE_COST}
            >
              <Shield aria-hidden="true" />買護盾（-{INSURANCE_COST}，答錯少扣）
            </button>
          )}
        </div>

        {available.length === 0 ? (
          <p className="learn-empty">這個年級目前沒有可對戰的題目，換個年級試試。</p>
        ) : finished ? (
          <div className="flashcard-done">
            <Sparkles aria-hidden="true" />
            <p>
              對戰結束！你 {player.score} 分，電腦 {computer.score} 分——
              {outcome === "win" ? "你贏了，太強了！" : outcome === "lose" ? "電腦這局領先，再來一場追回來！" : "平手，勢均力敵！"}
            </p>
            <button type="button" className="primary-button" onClick={() => startMatch()}>
              再來一場
            </button>
          </div>
        ) : (
          <section className="arena-question" aria-live="polite">
            <p className="arena-round">第 {round + 1} / {pool.length} 題</p>
            <h2 className="arena-prompt">{current.prompt}</h2>
            <ul className="arena-options" aria-label="選項">
              {current.options.map((option) => {
                const isCorrect = option.id === current.correctOptionId;
                const isPicked = option.id === picked;
                const showState = picked !== null;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      className={`arena-option${
                        showState && isCorrect ? " arena-option-correct" : ""
                      }${showState && isPicked && !isCorrect ? " arena-option-wrong" : ""}`}
                      onClick={() => answer(option.id)}
                      disabled={picked !== null}
                    >
                      {option.text}
                    </button>
                  </li>
                );
              })}
            </ul>

            {feedback && (
              <div className={`arena-feedback${feedback.correct ? " arena-feedback-good" : " arena-feedback-bad"}`}>
                <p className="arena-feedback-line">
                  {feedback.correct ? `答對！+${feedback.gain} 分` : `答錯了，-${feedback.penalty} 分（別擔心，這只是遊戲分數）`}
                </p>
                <p className="arena-feedback-cpu">
                  電腦{feedback.computerCorrect ? `答對，+${feedback.computerGain} 分` : "答錯，沒得分"}
                </p>
                <p className="arena-explain">{current.explanation}</p>
                <button type="button" className="primary-button" onClick={next}>
                  {round + 1 >= pool.length ? "看對戰結果" : "下一題"}
                </button>
              </div>
            )}
          </section>
        )}

        <div className="flashcard-tools">
          <button type="button" className="text-link" onClick={() => startMatch()}>
            <RotateCcw aria-hidden="true" />重新開始一場
          </button>
        </div>
      </main>
    </AppShell>
  );
}
