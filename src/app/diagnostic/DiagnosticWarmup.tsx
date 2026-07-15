"use client";

import { Sparkle } from "lucide-react";
import { useState } from "react";
import styles from "./diagnostic.module.css";

const DEMO_OPTIONS = [
  { id: "circle", label: "圓形", emoji: "🔵" },
  { id: "star", label: "星星", emoji: "⭐" },
] as const;

export function DiagnosticWarmup({ onReady }: { onReady: () => void }) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  return (
    <section className={styles.introCard} aria-labelledby="warmup-heading">
      <div className={styles.introHead}>
        <span className={styles.introIcon} aria-hidden="true">
          <Sparkle />
        </span>
        <div className={styles.introText}>
          <p className={`eyebrow ${styles.introEyebrow}`}>暖身練習・不計分</p>
          <h1 id="warmup-heading" className={styles.introTitle}>
            先點一下，感受一下待會兒怎麼作答。
          </h1>
          <p className={styles.introLead}>
            這不是診斷題，只是讓你先熟悉操作方式：點一個你喜歡的圖形試試看。
          </p>
        </div>
      </div>

      <div className={styles.warmupOptions} role="group" aria-label="示範選項">
        {DEMO_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`answer-option ${styles.warmupOption}`}
            aria-pressed={pickedId === option.id}
            onClick={() => setPickedId(option.id)}
          >
            <span aria-hidden="true">{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {pickedId ? (
        <div className={styles.warmupConfirm} role="status">
          <p>很棒，這就是待會兒的作答方式：點一個你覺得對的選項就可以了。</p>
          <button type="button" className="primary-button" onClick={onReady}>
            開始五題診斷戰
          </button>
        </div>
      ) : null}
    </section>
  );
}
