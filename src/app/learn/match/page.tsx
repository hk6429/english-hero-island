"use client";

import { ArrowLeft, Check, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { vocabByGrade } from "@/content/vocab-pairs";
import { buildMatchColumns, type MatchColumns, pickPairs } from "@/domain/self-learning/match-games";
import type { Grade } from "@/domain/questions/question-schema";

const GRADES: Grade[] = [3, 4, 5, 6];
const MATCH_COUNT = 6;

export default function MatchPage() {
  const [grade, setGrade] = useState<Grade>(3);
  const [columns, setColumns] = useState<MatchColumns>({ left: [], right: [] });
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const pairsInGrade = useMemo(() => vocabByGrade(grade), [grade]);
  const roundCount = Math.min(MATCH_COUNT, pairsInGrade.length);

  function newRound(nextGrade: Grade = grade) {
    setColumns(buildMatchColumns(pickPairs(vocabByGrade(nextGrade), MATCH_COUNT)));
    setSelectedLeft(null);
    setConnected([]);
    setWrong(null);
  }

  useEffect(() => {
    newRound(grade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  const done = connected.length === roundCount && roundCount > 0;

  function pickLeft(key: string) {
    if (connected.includes(key)) return;
    setWrong(null);
    setSelectedLeft(key);
  }

  function pickRight(key: string) {
    if (connected.includes(key) || selectedLeft === null) return;
    if (key === selectedLeft) {
      setConnected((prev) => [...prev, key]);
      setSelectedLeft(null);
      return;
    }
    setWrong(key);
    setSelectedLeft(null);
    setTimeout(() => setWrong(null), 650);
  }

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・連連看</p>
          <h1>連連看（英文對中文）</h1>
          <p className="learn-sub">
            先點左邊的英文，再點右邊對應的中文，配對就會變綠色。點錯不會怎樣，再試一次就好。
          </p>
        </header>

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

        <p className="learn-progress" role="status">
          連對 {connected.length} / {roundCount}
        </p>

        {done ? (
          <div className="flashcard-done">
            <Sparkles aria-hidden="true" />
            <p>全部連對了，太棒了！換個年級或再來一輪都可以。</p>
            <button type="button" className="primary-button" onClick={() => newRound()}>
              再玩一次
            </button>
          </div>
        ) : (
          <div className="match-board">
            <ul className="match-col" aria-label="英文">
              {columns.left.map((pair) => {
                const isDone = connected.includes(pair.en);
                const isSel = selectedLeft === pair.en;
                return (
                  <li key={`l-${pair.en}`}>
                    <button
                      type="button"
                      className={`match-item${isSel ? " match-item-sel" : ""}${isDone ? " match-item-done" : ""}`}
                      onClick={() => pickLeft(pair.en)}
                      aria-pressed={isSel}
                      disabled={isDone}
                    >
                      {isDone && <Check aria-hidden="true" size={16} />}
                      {pair.en}
                    </button>
                  </li>
                );
              })}
            </ul>
            <ul className="match-col" aria-label="中文">
              {columns.right.map((pair) => {
                const isDone = connected.includes(pair.en);
                const isWrong = wrong === pair.en;
                return (
                  <li key={`r-${pair.en}`}>
                    <button
                      type="button"
                      className={`match-item${isDone ? " match-item-done" : ""}${isWrong ? " match-item-wrong" : ""}`}
                      onClick={() => pickRight(pair.en)}
                      disabled={isDone}
                    >
                      {isDone && <Check aria-hidden="true" size={16} />}
                      <span aria-hidden="true">{pair.emoji}</span>
                      {pair.zh}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flashcard-tools">
          <button type="button" className="text-link" onClick={() => newRound()}>
            <RotateCcw aria-hidden="true" />換一組
          </button>
        </div>
      </main>
    </AppShell>
  );
}
