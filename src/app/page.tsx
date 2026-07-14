"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  GraduationCap,
  Map,
  ShieldCheck,
  Swords,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { useAdventure } from "@/features/adventure/AdventureProvider";

const stageRoute = {
  onboarding: "/start",
  diagnostic: "/diagnostic",
  island: "/island",
  mission: "/mission",
  battle: "/battle",
  result: "/result",
  training: "/training",
} as const;

export default function HomePage() {
  const { ready, progress } = useAdventure();
  const nextRoute = ready ? stageRoute[progress.stage] : "/start";

  return (
    <AppShell pageClassName="home-page">
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">國小三至六年級英語冒險</p>
            <h1>把不熟的地方，修成自己的能力島。</h1>
            <p className="hero-lead">
              先用五題找出起點，再用三到五分鐘完成一場任務。答錯會得到線索與救援，不會 Game Over。
            </p>
            <Link className="primary-button primary-link" href={nextRoute}>
              {progress.profile ? "繼續我的冒險" : "開始冒險"}
              <ArrowRight aria-hidden="true" />
            </Link>
            <p className="privacy-note">
              <ShieldCheck aria-hidden="true" />
              自主練習只需暱稱與年級，不用真實姓名、電子郵件或照片。
            </p>
          </div>
          <div className="island-preview" aria-label="英語英雄島任務預覽">
            <div className="island-orbit orbit-one" aria-hidden="true" />
            <div className="island-orbit orbit-two" aria-hidden="true" />
            <div className="hero-party">
              <HeroGlyph heroId="wave-scout" size="large" />
              <HeroGlyph heroId="forest-keeper" size="large" />
              <HeroGlyph heroId="star-smith" size="large" />
            </div>
            <div className="mission-ticket">
              <span>今日任務</span>
              <strong>修復一小段能力</strong>
              <small>約 3–5 分鐘</small>
            </div>
          </div>
        </section>

        <section className="home-feature-grid" aria-labelledby="how-title">
          <div className="section-heading">
            <p className="eyebrow">冒險怎麼進行</p>
            <h2 id="how-title">每一場戰鬥，都留下真正的學習證據</h2>
          </div>
          <article className="feature-card">
            <Map aria-hidden="true" />
            <h3>五題找到起點</h3>
            <p>診斷只推薦第一步，不會永久把學生貼上能力標籤。</p>
          </article>
          <article className="feature-card">
            <Swords aria-hidden="true" />
            <h3>短練功與 Boss</h3>
            <p>首次獨立答對、提示後答對與救援完成，會留下不同紀錄。</p>
          </article>
          <article className="feature-card">
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
            </div>
          </div>
          <span className="coming-chip">安全連線待設定</span>
        </section>
      </main>
    </AppShell>
  );
}
