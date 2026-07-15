"use client";

import { BookOpenCheck, Grid3x3, Link2, Sparkles, Swords, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function LearnHubPage() {
  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <header className="learn-head">
          <p className="eyebrow">自學小站</p>
          <h1>自己練，慢慢就記住了</h1>
          <p className="learn-sub">
            用小遊戲記單字：翻閃卡、翻翻牌、連連看。全部答錯不扣分、不計時、不比名次，想玩幾輪都可以。
          </p>
        </header>

        <div className="learn-grid">
          <Link className="learn-card learn-card-ready" href="/learn/flashcards">
            <span className="learn-card-icon" aria-hidden="true"><BookOpenCheck /></span>
            <h2>單字閃卡</h2>
            <p>五盒間隔複習：看英文想中文，會的往上升盒，不熟的多看幾次。</p>
            <span className="learn-card-go">開始練 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>

          <Link className="learn-card learn-card-ready" href="/learn/memory">
            <span className="learn-card-icon" aria-hidden="true"><Grid3x3 /></span>
            <h2>記憶翻牌</h2>
            <p>4×4 翻翻牌，把英文和中文配成一對。</p>
            <span className="learn-card-go">開始玩 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>

          <Link className="learn-card learn-card-ready" href="/learn/match">
            <span className="learn-card-icon" aria-hidden="true"><Link2 /></span>
            <h2>連連看</h2>
            <p>左邊英文、右邊中文，點一點連成正確的線。</p>
            <span className="learn-card-go">開始玩 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>

          <Link className="learn-card learn-card-ready" href="/learn/arena">
            <span className="learn-card-icon" aria-hidden="true"><Swords /></span>
            <h2>積分挑戰</h2>
            <p>單人對電腦答題賽：連對加倍、越答越升級。不排名、不進成績。</p>
            <span className="learn-card-go">開始挑戰 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>

          <Link className="learn-card learn-card-ready" href="/learn/versus">
            <span className="learn-card-icon" aria-hidden="true"><Users /></span>
            <h2>兩兩對戰</h2>
            <p>兩個人共用一台裝置輪流作答，最後比誰分數高。不排名、不進成績。</p>
            <span className="learn-card-go">找人對戰 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>

          <Link className="learn-card learn-card-ready" href="/learn/class-battle">
            <span className="learn-card-icon" aria-hidden="true"><UsersRound /></span>
            <h2>全班協力</h2>
            <p>全班一起把關卡能量填滿的合作模式。即時後端連上後由老師開場。</p>
            <span className="learn-card-go">看玩法 <Sparkles aria-hidden="true" size={18} /></span>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
