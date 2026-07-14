"use client";

import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import { deriveMastery } from "@/domain/mastery/derive-mastery";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { microSkillLabel } from "@/features/adventure/content-map";

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
        <main id="main-content" className="page-main">
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

  return (
    <AppShell pageClassName="result-page">
      <main id="main-content" className="page-main narrow-main">
        <section className="result-hero">
          <HeroGlyph heroId={profile.heroId} size="large" />
          <span className="result-spark" aria-hidden="true">
            <Sparkles />
          </span>
          <p className="eyebrow">任務完成</p>
          <h1>{microSkillLabel(focus)}已留下新的學習證據。</h1>
          <p>不是只有全對才算進步；知道何時用線索、完成救援，也都會進入下一次安排。</p>
        </section>

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

        <section className="mastery-card">
          <div>
            <p className="eyebrow">能力狀態</p>
            <h2>{mastery.status === "mastered" ? "精熟能力卡已點亮" : "已進入跨日確認"}</h2>
            <p>
              目前有 {mastery.independentDates.length} 個獨立完成日期、{mastery.independentSurfaces} 種不同表面題。
              需要兩天、兩種表面題都獨立完成，才會標示精熟。
            </p>
          </div>
          <span className="xp-medal">累積 {progress.xp} XP</span>
        </section>

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
