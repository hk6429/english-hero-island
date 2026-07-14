"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  LockKeyhole,
  Map,
  Sparkles,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import { pilotQuestionBank } from "@/content/pilot";
import { deriveMastery, type MasteryStatus } from "@/domain/mastery/derive-mastery";
import type { Skill } from "@/domain/questions/question-schema";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import {
  FOCUS_MICRO_SKILL,
  FOCUS_SKILL,
  MISSION_COPY,
  SKILL_LABELS,
  microSkillLabel,
} from "@/features/adventure/content-map";

const skills: Skill[] = [
  "letters",
  "phonics",
  "vocabulary",
  "classroom_english",
  "grammar",
  "comprehension",
];

const statusCopy: Readonly<Record<MasteryStatus, string>> = {
  unassessed: "尚未診斷",
  practicing: "練習中",
  pending_confirmation: "待跨日確認",
  mastered: "已精熟",
};

export default function IslandPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const profile = progress.profile;

  useEffect(() => {
    if (ready && !profile) router.replace("/start");
    else if (ready && profile && progress.stage === "result") {
      dispatch({ type: "return_to_island" });
    }
  }, [dispatch, profile, progress.stage, ready, router]);

  if (!ready || !profile) {
    return (
      <AppShell>
        <main id="main-content" className="page-main">
          <p className="loading-state">正在展開能力地圖……</p>
        </main>
      </AppShell>
    );
  }

  const focus = FOCUS_MICRO_SKILL[profile.grade];
  const mission = MISSION_COPY[profile.grade];
  const focusMastery = deriveMastery(focus, progress.events);
  const secretUnlocked = progress.repairedZones.length >= 3;
  const diagnosticQuestions = pilotQuestionBank.filter(
    (question) => question.grade === profile.grade && question.purpose === "diagnostic",
  );

  return (
    <AppShell pageClassName="island-page">
      <main id="main-content" className="page-main">
        <section className="island-welcome">
          <HeroGlyph heroId={profile.heroId} size="large" />
          <div>
            <p className="eyebrow">{profile.nickname} 的能力島</p>
            <h1>地圖不是分數表，是下一步的導航。</h1>
            <p>診斷只決定今天的起點；之後每一次作答，都能改變能力狀態。</p>
          </div>
        </section>

        <section className="mission-recommendation" aria-labelledby="mission-title">
          <div className="mission-copy">
            <span className="mission-place">
              <Map aria-hidden="true" />
              今日推薦・{mission.place}
            </span>
            <h2 id="mission-title">{mission.title}</h2>
            <p>{mission.story}</p>
            <div className="recommendation-reason">
              <Sprout aria-hidden="true" />
              <span>
                聚焦能力：<strong>{microSkillLabel(focus)}</strong>。先完成這條試作路徑，地圖就會亮起第一區。
              </span>
            </div>
          </div>
          <div className="mission-actions">
            <span className={`status-pill status-${focusMastery.status}`}>
              {statusCopy[focusMastery.status]}
            </span>
            <Link className="primary-button primary-link" href="/mission">
              前往今日任務
              <ArrowRight aria-hidden="true" />
            </Link>
            <small>預計 3–5 分鐘，共 5 題練功＋1 題 Boss。</small>
          </div>
        </section>

        <section className="zone-section" aria-labelledby="zone-title">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">六區能力地圖</p>
              <h2 id="zone-title">看見成長，也看見還能前進的地方</h2>
            </div>
            <Link className="text-link" href="/dex">
              <BookOpenCheck aria-hidden="true" /> 查看能力圖鑑
            </Link>
          </div>
          <div className="zone-grid">
            {skills.map((skill, index) => {
              const isFocusZone = skill === FOCUS_SKILL[profile.grade];
              const sampledMicroSkill = isFocusZone
                ? focus
                : diagnosticQuestions.find((question) => question.skill === skill)?.microSkill;
              const status = sampledMicroSkill
                ? deriveMastery(sampledMicroSkill, progress.events).status
                : "unassessed";
              const repaired = sampledMicroSkill
                ? progress.repairedZones.includes(sampledMicroSkill)
                : false;

              return (
                <article className={`zone-card zone-${index + 1} ${isFocusZone ? "focus-zone" : ""}`} key={skill}>
                  <span className="zone-icon" aria-hidden="true">
                    {repaired ? <CheckCircle2 /> : isFocusZone ? <Sparkles /> : <CircleDashed />}
                  </span>
                  <div>
                    <h3>{SKILL_LABELS[skill]}</h3>
                    <p>{sampledMicroSkill ? microSkillLabel(sampledMicroSkill) : "後續題庫擴充區"}</p>
                  </div>
                  <span className={`zone-status status-${status}`}>{repaired ? "已修復" : statusCopy[status]}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className={`secret-zone ${secretUnlocked ? "unlocked" : ""}`} aria-labelledby="secret-title">
          <span className="secret-icon" aria-hidden="true">
            {secretUnlocked ? <Sparkles /> : <LockKeyhole />}
          </span>
          <div>
            <p className="eyebrow">能力門檻，不是付費牆</p>
            <h2 id="secret-title">雲端秘境</h2>
            <p>{secretUnlocked ? "三區已修復，秘境入口出現了。" : `再修復 ${3 - progress.repairedZones.length} 區，就能解鎖新的故事任務。`}</p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
