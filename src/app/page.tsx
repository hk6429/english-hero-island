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
import Image from "next/image";
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
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">國小三至六年級英語冒險</p>
            <h1>把不熟的地方，修成自己的能力島。</h1>
            <p className="hero-lead">
              先用五題找出起點，再一場一場小任務，把不熟的能力慢慢修回來。答錯不扣分，會得到線索與救援。
            </p>
            <ul className={styles.trustChips} aria-label="給家長與孩子的三個安心點">
              <li className={styles.trustChip}>
                <Timer aria-hidden="true" size={18} />
                一場任務約 3–5 分鐘
              </li>
              <li className={styles.trustChip}>
                <LifeBuoy aria-hidden="true" size={18} />
                答錯有線索與救援
              </li>
              <li className={styles.trustChip}>
                <EyeOff aria-hidden="true" size={18} />
                不公開成績與排名
              </li>
            </ul>
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
            <Link className="primary-button primary-link" href={nextRoute}>
              {progress.profile ? "繼續我的冒險" : "開始冒險"}
              <ArrowRight aria-hidden="true" />
            </Link>
            <p className="privacy-note">
              <ShieldCheck aria-hidden="true" />
              自主練習只需暱稱與年級，不用真實姓名、電子郵件或照片。
            </p>
          </div>
          <section className="island-preview" aria-label="英語英雄島任務預覽">
            <Image
              className="island-photo"
              src="/art/island-key-visual.jpg"
              alt="水彩酒精潑染畫風的英語英雄島鳥瞰圖：三位 Q 版小英雄站在島中央的石板路上，周圍有字母港、拼讀森林、字詞花園、對話小鎮、句型工坊與理解燈塔"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
              priority
            />
            <div className="hero-party">
              <HeroPortrait heroId="wave-scout" size="small" />
              <HeroPortrait heroId="forest-keeper" size="small" />
              <HeroPortrait heroId="star-smith" size="small" />
            </div>
            <div className="mission-ticket">
              <span>今日任務</span>
              <strong>修復一小段能力</strong>
              <small>約 3–5 分鐘</small>
            </div>
          </section>
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
