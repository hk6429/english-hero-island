"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  EyeOff,
  GraduationCap,
  LifeBuoy,
  Map,
  ShieldCheck,
  Swords,
  Timer,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { HeroPortrait } from "@/components/adventure/HeroPortrait";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import type { AdventureStage } from "@/infrastructure/progress/progress-types";
import styles from "./page.module.css";

const stageRoute = {
  onboarding: "/start",
  diagnostic: "/diagnostic",
  island: "/island",
  mission: "/mission",
  battle: "/battle",
  result: "/result",
  training: "/training",
} as const;

const stageLabel: Record<AdventureStage, string> = {
  onboarding: "建立英雄",
  diagnostic: "五題診斷戰",
  island: "能力島",
  mission: "今日任務",
  battle: "任務戰鬥",
  result: "學習證據",
  training: "修煉場",
};

export default function HomePage() {
  const { ready, progress } = useAdventure();
  const nextRoute = ready ? stageRoute[progress.stage] : "/start";

  return (
    <AppShell pageClassName="home-page">
      <main id="main-content" tabIndex={-1}>
        <section className="hero-stage" aria-labelledby="hero-title">
          <div className="ink-panel ink-left" aria-hidden="true" />
          <div className="ink-panel ink-right" aria-hidden="true" />
          <div className="hero-stage-inner">
            <p className="eyebrow">國小三至六年級・英語學習扶助冒險</p>
            <h1
              id="hero-title"
              className="hero-title"
              aria-label="把不熟的地方，修成自己的能力島。"
            >
              <span className="title-clause">把不熟的地方，</span>
              <span className="title-clause">修成自己的能力島。</span>
            </h1>
            <p className="hero-subtitle">
              <span className="subtitle-part">五題找起點</span>
              <span className="subtitle-dot" aria-hidden="true">・</span>
              <span className="subtitle-part">一場一場小任務</span>
              <span className="subtitle-dot" aria-hidden="true">・</span>
              <span className="subtitle-part">答錯不扣分，會得到線索與救援</span>
            </p>

            <ul className="stat-row" aria-label="給家長與孩子的三個安心點">
              <li className="stat-card">
                <Timer aria-hidden="true" size={22} />
                <strong>3–5 分鐘</strong>
                <span>一場任務</span>
              </li>
              <li className="stat-card">
                <LifeBuoy aria-hidden="true" size={22} />
                <strong>線索＋救援</strong>
                <span>答錯不扣分</span>
              </li>
              <li className="stat-card">
                <EyeOff aria-hidden="true" size={22} />
                <strong>不排名</strong>
                <span>不公開成績</span>
              </li>
            </ul>

            <div className="hero-cast">
              <figure className="cast-hero cast-side">
                <HeroPortrait heroId="wave-scout" size="large" alt="海風偵察員小浪" />
                <figcaption>小浪・海風偵察員</figcaption>
              </figure>
              <figure className="cast-hero cast-lead">
                <HeroPortrait heroId="forest-keeper" size="large" alt="森林守護員小森" />
                <figcaption>小森・森林守護員</figcaption>
              </figure>
              <figure className="cast-hero cast-side">
                <HeroPortrait heroId="star-smith" size="large" alt="星光鍛造師小星" />
                <figcaption>小星・星光鍛造師</figcaption>
              </figure>
            </div>

            <Link className="launch-button" href={nextRoute}>
              <span className="launch-label">
                {progress.profile ? "繼續冒險" : "出發"}
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>

            <Link className="home-learn-link" href="/learn">
              <BookOpenCheck aria-hidden="true" size={18} />
              想先自己練？來自學小站玩閃卡、記憶牌、連連看
            </Link>

            {ready && progress.profile ? (
              <p className={styles.welcomeBack}>
                <HeroGlyph
                  heroId={progress.profile.heroId}
                  accent={progress.profile.accent ?? "ocean"}
                  size="small"
                />
                <span>
                  <strong>{progress.profile.nickname}</strong>
                  ，歡迎回島！上次冒險停在「{stageLabel[progress.stage]}」。
                </span>
              </p>
            ) : null}

            <p className="privacy-note centered-note">
              <ShieldCheck aria-hidden="true" />
              自主練習只需暱稱與年級，不用真實姓名、電子郵件或照片。
            </p>
          </div>
        </section>

        <section className="home-feature-grid" aria-labelledby="how-title">
          <div className="section-heading">
            <p className="eyebrow">冒險怎麼進行</p>
            <h2 id="how-title">每一場戰鬥，都留下真正的學習證據</h2>
          </div>
          <article className="feature-card">
            <span className={styles.stepBadge}>第 1 步</span>
            <Map aria-hidden="true" />
            <h3>五題找到起點</h3>
            <p>診斷只推薦第一步，不會永久把學生貼上能力標籤。</p>
          </article>
          <article className="feature-card">
            <span className={styles.stepBadge}>第 2 步</span>
            <Swords aria-hidden="true" />
            <h3>短練功與 Boss</h3>
            <p>首次獨立答對、提示後答對與救援完成，會留下不同紀錄。</p>
          </article>
          <article className="feature-card">
            <span className={styles.stepBadge}>第 3 步</span>
            <BookOpenCheck aria-hidden="true" />
            <h3>跨日確認精熟</h3>
            <p>兩個不同日期、不同表面題都能獨立完成，才會成為精熟能力卡。</p>
          </article>
        </section>

        <section className="classroom-teaser" aria-labelledby="classroom-title">
          <div>
            <p className="eyebrow">教師課堂系統</p>
            <h2 id="classroom-title">六碼加入、教師快派與安全資料層已進入連線階段</h2>
            <p>課堂版不公開個人成績、速度或排名；未設定專用後端前也不會產生假活動。</p>
            <div className="classroom-teaser-actions">
              <Link className="secondary-button secondary-link" href="/join">
                <UsersRound aria-hidden="true" />學生輸入活動碼
              </Link>
              <Link className="text-link" href="/teacher">
                <GraduationCap aria-hidden="true" />教師工作區
              </Link>
              <Link className="text-link" href="/governance">
                <ClipboardCheck aria-hidden="true" />題庫複核工作區
              </Link>
            </div>
          </div>
          <span className="coming-chip">安全連線待設定</span>
        </section>
      </main>
    </AppShell>
  );
}
