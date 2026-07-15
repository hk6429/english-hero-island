"use client";

import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, PartyPopper, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { StreakGlow } from "@/components/adventure/StreakGlow";
import { XpCountUp } from "@/components/adventure/XpCountUp";
import { AppShell } from "@/components/layout/AppShell";
import { ShareEncouragementButton } from "@/components/social/ShareEncouragementButton";
import { PairEncouragementRelay } from "@/components/social/PairEncouragementRelay";
import { playableQuestionBank } from "@/content/playable";
import { deriveBossDefeated } from "@/domain/battle/derive-boss-defeated";
import { deriveMastery } from "@/domain/mastery/derive-mastery";
import { deriveOutcomeStory } from "@/domain/story/derive-outcome-story";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { HINT_TOOLS, microSkillLabel } from "@/features/adventure/content-map";
import styles from "./result.module.css";

export default function ResultPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const profile = progress.profile;
  const session = progress.activeSession;

  useEffect(() => {
    if (!ready) return;
    if (!profile) router.replace("/start");
    else if (!session) router.replace("/island");
  }, [profile, ready, router, session]);

  if (!ready || !profile || !session) {
    return (
      <AppShell>
        <main id="main-content" className="page-main" tabIndex={-1}>
          <p className="loading-state">正在整理冒險紀錄……</p>
        </main>
      </AppShell>
    );
  }

  const sessionEvents = progress.events.filter((event) => event.sessionId === session.id);
  const independent = sessionEvents.filter((event) => event.outcome === "independent_correct").length;
  const supported = sessionEvents.filter((event) => event.outcome === "assisted_correct").length;
  const rescued = sessionEvents.filter(
    (event) => event.outcome === "rescued" || event.outcome === "pending_support",
  ).length;
  const focus = session.microSkill ?? sessionEvents[0]?.microSkill ?? "adventure";
  const mastery = deriveMastery(focus, progress.events);
  const story = deriveOutcomeStory(session.outcomes, progress.completedMissionCount);
  const relayStrategy = HINT_TOOLS.find((tool) => tool.id === session.selectedTool) ?? {
    name: "慢慢排除",
    description: "先找題目關鍵字，再排除不相符的選項。",
  };
  const sessionXpGained = session.sessionXp ?? 0;
  const xpBeforeSession = Math.max(0, progress.xp - sessionXpGained);
  const bossDefeated = deriveBossDefeated(sessionEvents, playableQuestionBank);

  return (
    <AppShell pageClassName="result-page">
      <main id="main-content" className="page-main narrow-main" tabIndex={-1}>
        <section className={`result-hero ${styles.heroCelebrate}`}>
          <HeroGlyph heroId={profile.heroId} accent={profile.accent} size="large" />
          <span className="result-spark" aria-hidden="true">
            <Sparkles />
          </span>
          <p className="eyebrow">任務完成</p>
          <h1>{microSkillLabel(focus)}已留下新的學習證據。</h1>
          <p>不是只有全對才算進步；知道何時用線索、完成救援，也都會進入下一次安排。</p>
        </section>

        {bossDefeated ? (
          <section className={`boss-flourish ${styles.bossFlourish}`} role="status">
            <PartyPopper aria-hidden="true" />
            <p>Boss 已擊退！這只是換了故事演出，你用的方法和精熟規則完全沒有變。</p>
          </section>
        ) : null}

        <section
          className={`story-branch story-${story.tone}`}
          aria-labelledby="story-branch-title"
        >
          <span className="story-symbol" aria-hidden="true">
            <Sparkles />
          </span>
          <div>
            <p className="eyebrow">本次探索分支</p>
            <h2 id="story-branch-title">{story.title}</h2>
            <p>{story.story}</p>
          </div>
        </section>

        <section className="mastery-card">
          <div>
            <p className="eyebrow">能力狀態</p>
            <h2>{mastery.status === "mastered" ? "精熟能力卡已點亮" : "已進入跨日確認"}</h2>
            <p>
              目前有 {mastery.independentDates.length} 個獨立完成日期、{mastery.independentSurfaces} 種不同表面題。
              需要兩天、兩種表面題都獨立完成，才會標示精熟。
            </p>
          </div>
          <span className="xp-medal">
            累積 <XpCountUp from={xpBeforeSession} to={progress.xp} />
            <span className="sr-only">{progress.xp}</span> XP
          </span>
        </section>

        <p className={styles.gridCaption}>數字只是紀錄；會用線索、完成救援，也都是這次帶走的成長。</p>
        <section className="result-grid" aria-label="本次任務結果">
          <article>
            <CheckCircle2 aria-hidden="true" />
            <strong>{independent}</strong>
            <span>首次獨立答對</span>
          </article>
          <article>
            <BookOpenCheck aria-hidden="true" />
            <strong>{supported}</strong>
            <span>提示後完成</span>
          </article>
          <article>
            <Clock3 aria-hidden="true" />
            <strong>{rescued}</strong>
            <span>救援／待回流</span>
          </article>
        </section>

        <StreakGlow streak={progress.streak} compact />

        <section className="encouragement-card" aria-labelledby="encouragement-title">
          <div>
            <p className="eyebrow">不排名的學伴互動</p>
            <h2 id="encouragement-title">把一句方法送給下一位學伴</h2>
            <p>分享內容不含姓名、XP、分數或錯題；由你自己決定要不要傳，以及傳給誰。</p>
          </div>
          <ShareEncouragementButton abilityLabel={microSkillLabel(focus)} />
        </section>

        <PairEncouragementRelay
          strategyName={relayStrategy.name}
          strategyMessage={relayStrategy.description}
          repairCount={progress.partnerEncouragements.length}
          onReceive={(message, applicationResponse) =>
            dispatch({
              type: "record_partner_encouragement",
              card: {
                id: crypto.randomUUID(),
                message,
                applicationResponse,
                receivedAt: new Date().toISOString(),
              },
            })
          }
        />

        <div className="result-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              dispatch({ type: "open_training" });
              router.push("/training");
            }}
          >
            安排下一次修煉
            <ArrowRight aria-hidden="true" />
          </button>
          <Link className="secondary-button secondary-link" href="/dex">
            查看能力圖鑑
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
