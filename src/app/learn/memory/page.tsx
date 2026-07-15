"use client";

import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { vocabByGrade } from "@/content/vocab-pairs";
import {
  buildMemoryDeck,
  isMemoryMatch,
  type MemoryCard,
  pickPairs,
} from "@/domain/self-learning/match-games";
import type { Grade } from "@/domain/questions/question-schema";

const GRADES: Grade[] = [3, 4, 5, 6];
const PAIR_COUNT = 8;

export default function MemoryPage() {
  const [grade, setGrade] = useState<Grade>(3);
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const pairsInGrade = useMemo(() => vocabByGrade(grade), [grade]);

  function newRound(nextGrade: Grade = grade) {
    setDeck(buildMemoryDeck(pickPairs(vocabByGrade(nextGrade), PAIR_COUNT)));
    setRevealed([]);
    setMatched([]);
    setMoves(0);
    setLocked(false);
  }

  // 首次載入與換年級都重新發牌
  useEffect(() => {
    newRound(grade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  useEffect(() => {
    if (revealed.length !== 2) {
      return;
    }
    setLocked(true);
    setMoves((prev) => prev + 1);
    const [a, b] = revealed.map((id) => deck.find((card) => card.id === id)!);
    if (a && b && isMemoryMatch(a, b)) {
      setMatched((prev) => [...prev, a.key]);
      setRevealed([]);
      setLocked(false);
      return;
    }
    const timer = setTimeout(() => {
      setRevealed([]);
      setLocked(false);
    }, 850);
    return () => clearTimeout(timer);
  }, [revealed, deck]);

  const pairCount = Math.min(PAIR_COUNT, pairsInGrade.length);
  const done = matched.length === pairCount && pairCount > 0;

  function flip(card: MemoryCard) {
    if (locked || revealed.includes(card.id) || matched.includes(card.key)) {
      return;
    }
    setRevealed((prev) => [...prev, card.id]);
  }

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・記憶翻牌</p>
          <h1>記憶翻牌（英文配中文）</h1>
          <p className="learn-sub">
            翻開兩張牌，把英文和中文配成一對。配對成功就留在桌上，配錯會蓋回去——多試幾次就記住囉。不計時、不比名次。
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
          配對 {matched.length} / {pairCount}　翻牌 {moves} 次
        </p>

        {done ? (
          <div className="flashcard-done">
            <Sparkles aria-hidden="true" />
            <p>全部配對成功，好厲害！用了 {moves} 次翻牌。要不要再來一局？</p>
            <button type="button" className="primary-button" onClick={() => newRound()}>
              再玩一次
            </button>
          </div>
        ) : (
          <ul className="memory-grid" aria-label="記憶翻牌">
            {deck.map((card) => {
              const isUp = revealed.includes(card.id) || matched.includes(card.key);
              const isGone = matched.includes(card.key);
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    className={`memory-card${isUp ? " memory-card-up" : ""}${isGone ? " memory-card-done" : ""}`}
                    onClick={() => flip(card)}
                    aria-label={isUp ? (card.kind === "en" ? card.en : `${card.zh}`) : "蓋著的牌"}
                    aria-pressed={isUp}
                  >
                    {isUp ? (
                      card.kind === "en" ? (
                        <span className="memory-en">{card.en}</span>
                      ) : (
                        <span className="memory-zh">
                          <span aria-hidden="true">{card.emoji}</span>
                          {card.zh}
                        </span>
                      )
                    ) : (
                      <span className="memory-back" aria-hidden="true">?</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flashcard-tools">
          <button type="button" className="text-link" onClick={() => newRound()}>
            <RotateCcw aria-hidden="true" />重新洗牌
          </button>
        </div>
      </main>
    </AppShell>
  );
}
