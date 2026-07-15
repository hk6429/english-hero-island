"use client";

import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { vocabByGrade } from "@/content/vocab-pairs";
import {
  applyAnswer,
  type BoxMap,
  dueOrder,
  initBoxes,
  isAllMastered,
  LEITNER_MAX_BOX,
} from "@/domain/self-learning/leitner";
import type { Grade } from "@/domain/questions/question-schema";

const GRADES: Grade[] = [3, 4, 5, 6];
const storageKey = (grade: Grade) => `ehi.leitner.g${grade}`;

function loadBoxes(grade: Grade, keys: string[]): BoxMap {
  if (typeof window === "undefined") {
    return initBoxes(keys);
  }
  try {
    const raw = window.localStorage.getItem(storageKey(grade));
    if (!raw) {
      return initBoxes(keys);
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    const map: Record<string, number> = {};
    for (const key of keys) {
      map[key] = parsed[key] ?? 1;
    }
    return map;
  } catch {
    return initBoxes(keys);
  }
}

export default function FlashcardsPage() {
  const [grade, setGrade] = useState<Grade>(3);
  const pairs = useMemo(() => vocabByGrade(grade), [grade]);
  const keys = useMemo(() => pairs.map((pair) => pair.en), [pairs]);

  const [boxes, setBoxes] = useState<BoxMap>(() => initBoxes(keys));
  const [order, setOrder] = useState<string[]>(keys);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // 換年級時，從 localStorage 載入該年級盒表並重排複習順序
  useEffect(() => {
    const loaded = loadBoxes(grade, keys);
    setBoxes(loaded);
    setOrder(dueOrder(keys, loaded));
    setPosition(0);
    setFlipped(false);
  }, [grade, keys]);

  const currentKey = order[position] ?? keys[0];
  const currentPair = pairs.find((pair) => pair.en === currentKey) ?? pairs[0];
  const masteredCount = keys.filter((key) => (boxes[key] ?? 1) === LEITNER_MAX_BOX).length;
  const allMastered = isAllMastered(keys, boxes);

  function persist(next: BoxMap) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(grade), JSON.stringify(next));
    }
  }

  function answer(known: boolean) {
    const next = applyAnswer(boxes, currentKey, known);
    setBoxes(next);
    persist(next);
    setFlipped(false);
    setPosition((prev) => (prev + 1 < order.length ? prev + 1 : 0));
  }

  function reshuffle() {
    setOrder(dueOrder(keys, boxes));
    setPosition(0);
    setFlipped(false);
  }

  function resetGrade() {
    const fresh = initBoxes(keys);
    setBoxes(fresh);
    persist(fresh);
    setOrder(keys);
    setPosition(0);
    setFlipped(false);
  }

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・閃卡</p>
          <h1>單字閃卡（五盒複習）</h1>
          <p className="learn-sub">
            看英文想中文，翻牌對答案。會的往上升一盒，不熟的回第一盒——多看幾輪就記住了。答錯不扣分、不計時。
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
          精熟 {masteredCount} / {keys.length} 個單字（第 {position + 1} / {order.length} 張）
        </p>

        {allMastered ? (
          <div className="flashcard-done">
            <Sparkles aria-hidden="true" />
            <p>這個年級的單字你全部升到第五盒了，超棒！可以換年級或重新練一輪。</p>
          </div>
        ) : (
          <button
            type="button"
            className={`flashcard${flipped ? " flashcard-flipped" : ""}`}
            onClick={() => setFlipped((prev) => !prev)}
            aria-label={flipped ? `答案：${currentPair.zh}` : `英文單字 ${currentPair.en}，點一下看中文`}
          >
            <span className="flashcard-emoji" aria-hidden="true">{currentPair.emoji}</span>
            <span className="flashcard-face">{flipped ? currentPair.zh : currentPair.en}</span>
            <span className="flashcard-hint">{flipped ? "認得就按「我會了」" : "點一下翻牌"}</span>
          </button>
        )}

        {!allMastered && (
          <div className="flashcard-actions">
            <button type="button" className="secondary-button" onClick={() => answer(false)}>
              再看看
            </button>
            <button type="button" className="primary-button" onClick={() => answer(true)}>
              我會了
            </button>
          </div>
        )}

        <div className="flashcard-tools">
          <button type="button" className="text-link" onClick={reshuffle}>
            <RotateCcw aria-hidden="true" />依熟練度重排
          </button>
          <button type="button" className="text-link" onClick={resetGrade}>
            清除本年級進度
          </button>
        </div>
      </main>
    </AppShell>
  );
}
