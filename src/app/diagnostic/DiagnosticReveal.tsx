"use client";

import { PartyPopper } from "lucide-react";
import { FOCUS_MICRO_SKILL, MISSION_COPY, microSkillLabel } from "@/features/adventure/content-map";
import type { Grade } from "@/domain/questions/question-schema";
import styles from "./diagnostic.module.css";

export function DiagnosticReveal({ grade, onContinue }: { grade: Grade; onContinue: () => void }) {
  const focusMicroSkill = FOCUS_MICRO_SKILL[grade];
  const place = MISSION_COPY[grade].place;

  return (
    <section className={styles.revealCard} aria-labelledby="reveal-heading">
      <div className={styles.introHead}>
        <span className={styles.introIcon} aria-hidden="true">
          <PartyPopper />
        </span>
        <div className={styles.introText}>
          <p className={`eyebrow ${styles.introEyebrow}`}>起點偵測完成</p>
          <h1 id="reveal-heading" className={styles.introTitle}>
            五題都走完了，你的第一站找到了！
          </h1>
          <p className={styles.introLead}>
            這不是分數，只是幫你排出最適合開始的順序。護盾與進度都完整保留。
          </p>
        </div>
      </div>
      <p className={styles.revealNext}>
        第一站：<strong>{place}</strong>，練習「{microSkillLabel(focusMicroSkill)}」。
      </p>
      <button type="button" className="primary-button" onClick={onContinue}>
        前往能力島
      </button>
    </section>
  );
}
