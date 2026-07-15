"use client";

import { ArrowLeft, Eye, RotateCcw, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { playableQuestionBank } from "@/content/playable";
import {
  applyAnswer,
  type ArenaState,
  INITIAL_ARENA,
  multiplierForStreak,
} from "@/domain/arena/scoring";
import { shuffle } from "@/domain/self-learning/match-games";
import type { Grade, Question } from "@/domain/questions/question-schema";

const GRADES: Grade[] = [3, 4, 5, 6];
const ROUNDS_EACH = 5;

function textQuestionsForGrade(grade: Grade): Question[] {
  return playableQuestionBank.filter(
    (question) =>
      question.grade === grade &&
      question.modality === "text" &&
      question.questionType === "multiple_choice",
  );
}

type Phase = "setup" | "handoff" | "answer" | "result";

export default function VersusPage() {
  const [grade, setGrade] = useState<Grade>(3);
  const [names, setNames] = useState<[string, string]>(["玩家一", "玩家二"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pools, setPools] = useState<[Question[], Question[]]>([[], []]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [counts, setCounts] = useState<[number, number]>([0, 0]);
  const [states, setStates] = useState<[ArenaState, ArenaState]>([INITIAL_ARENA, INITIAL_ARENA]);
  const [picked, setPicked] = useState<string | null>(null);
  const [gain, setGain] = useState<number | null>(null);

  const available = useMemo(() => textQuestionsForGrade(grade), [grade]);

  function start() {
    // 兩位玩家各抽一份互不重疊的題序，避免偷看對方答案。
    const shuffled = shuffle(available);
    const half = Math.min(ROUNDS_EACH, Math.floor(shuffled.length / 2));
    setPools([shuffled.slice(0, half), shuffled.slice(half, half * 2)]);
    setTurn(0);
    setCounts([0, 0]);
    setStates([INITIAL_ARENA, INITIAL_ARENA]);
    setPicked(null);
    setGain(null);
    setPhase("handoff");
  }

  const roundsPerPlayer = Math.min(ROUNDS_EACH, Math.floor(available.length / 2));
  const current = pools[turn][counts[turn]];
  const totalAnswered = counts[0] + counts[1];
  const allDone = totalAnswered >= roundsPerPlayer * 2;

  function answer(optionId: string) {
    if (picked !== null || !current) {
      return;
    }
    const correct = optionId === current.correctOptionId;
    const outcome = applyAnswer(states[turn], correct);
    const nextStates: [ArenaState, ArenaState] = turn === 0
      ? [outcome.state, states[1]]
      : [states[0], outcome.state];
    setStates(nextStates);
    setPicked(optionId);
    setGain(correct ? outcome.gain : 0);
  }

  function finishTurn() {
    const nextCounts: [number, number] = turn === 0
      ? [counts[0] + 1, counts[1]]
      : [counts[0], counts[1] + 1];
    setCounts(nextCounts);
    setPicked(null);
    setGain(null);
    if (nextCounts[0] + nextCounts[1] >= roundsPerPlayer * 2) {
      setPhase("result");
      return;
    }
    setTurn((prev) => (prev === 0 ? 1 : 0));
    setPhase("handoff");
  }

  const winner =
    states[0].score > states[1].score ? 0 : states[0].score < states[1].score ? 1 : -1;
  const nextMultiplier = current ? multiplierForStreak(states[turn].streak + 1) : 1;

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・兩兩對戰</p>
          <h1>兩兩對戰（同一台裝置輪流）</h1>
          <p className="learn-sub">
            兩個人共用一台裝置，輪流作答，每人 {roundsPerPlayer || ROUNDS_EACH} 題。答對得分、連對加倍，最後比誰分數高。這是好玩的練習賽——不排名、不進成績。
          </p>
        </header>

        {phase === "setup" && (
          <form
            className="versus-setup"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <div className="grade-picker" role="group" aria-label="選擇年級">
              {GRADES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`grade-chip${option === grade ? " grade-chip-active" : ""}`}
                  aria-pressed={option === grade}
                  onClick={() => setGrade(option)}
                >
                  {option} 年級
                </button>
              ))}
            </div>

            <label className="versus-field">
              <span>玩家一暱稱</span>
              <input
                type="text"
                value={names[0]}
                maxLength={8}
                onChange={(event) => setNames([event.target.value, names[1]])}
              />
            </label>
            <label className="versus-field">
              <span>玩家二暱稱</span>
              <input
                type="text"
                value={names[1]}
                maxLength={8}
                onChange={(event) => setNames([names[0], event.target.value])}
              />
            </label>

            <button type="submit" className="primary-button" disabled={available.length < 2}>
              開始對戰
            </button>
            {available.length < 2 && (
              <p className="learn-empty">這個年級題目不足以對戰，換個年級試試。</p>
            )}
          </form>
        )}

        {phase !== "setup" && (
          <div className="arena-scoreboard" role="status">
            <div className={`arena-score${winner === 0 && phase === "result" ? " arena-score-me" : ""}`}>
              <span className="arena-score-label">{names[0] || "玩家一"}</span>
              <span className="arena-score-value">{states[0].score}</span>
            </div>
            <div className={`arena-score arena-score-cpu${winner === 1 && phase === "result" ? " arena-score-me" : ""}`}>
              <span className="arena-score-label">{names[1] || "玩家二"}</span>
              <span className="arena-score-value">{states[1].score}</span>
            </div>
          </div>
        )}

        {phase === "handoff" && (
          <div className="versus-handoff">
            <Eye aria-hidden="true" />
            <h2>輪到「{names[turn] || (turn === 0 ? "玩家一" : "玩家二")}」作答</h2>
            <p>請其他人先別看螢幕。準備好了就開始這一題。</p>
            <button type="button" className="primary-button" onClick={() => setPhase("answer")}>
              我準備好了
            </button>
          </div>
        )}

        {phase === "answer" && current && (
          <section className="arena-question" aria-live="polite">
            <p className="arena-round">
              {names[turn] || (turn === 0 ? "玩家一" : "玩家二")}：第 {counts[turn] + 1} / {roundsPerPlayer} 題
            </p>
            <p className="arena-combo">
              <Zap aria-hidden="true" />連對 {states[turn].streak}（下一題 ×{nextMultiplier}）
            </p>
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
                      className={`arena-option${showState && isCorrect ? " arena-option-correct" : ""}${
                        showState && isPicked && !isCorrect ? " arena-option-wrong" : ""
                      }`}
                      onClick={() => answer(option.id)}
                      disabled={picked !== null}
                    >
                      {option.text}
                    </button>
                  </li>
                );
              })}
            </ul>

            {picked !== null && (
              <div className={`arena-feedback${gain ? " arena-feedback-good" : " arena-feedback-bad"}`}>
                <p className="arena-feedback-line">
                  {gain ? `答對！+${gain} 分` : "答錯了，這題沒得分（別擔心，只是遊戲分數）"}
                </p>
                <p className="arena-explain">{current.explanation}</p>
                <button type="button" className="primary-button" onClick={finishTurn}>
                  {allDone ? "看對戰結果" : "完成，交給下一位"}
                </button>
              </div>
            )}
          </section>
        )}

        {phase === "result" && (
          <div className="flashcard-done">
            <Sparkles aria-hidden="true" />
            <p>
              對戰結束！
              {winner === -1
                ? "平手，兩位一樣厲害！"
                : `「${names[winner] || (winner === 0 ? "玩家一" : "玩家二")}」這局分數比較高，恭喜！`}
            </p>
            <button type="button" className="primary-button" onClick={() => setPhase("setup")}>
              <RotateCcw aria-hidden="true" />再來一場
            </button>
          </div>
        )}
      </main>
    </AppShell>
  );
}
