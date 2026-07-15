import { ArrowLeft, Cable, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  applyRound,
  classProgress,
  initClassBattle,
  type RoundSubmission,
} from "@/domain/class-battle/cooperative";
import { readSupabasePublicConfig } from "@/infrastructure/supabase/browser-client";

// 示意用的假想回合（清楚標示為範例，不是任何真實班級資料）。
const SAMPLE_ROUND: RoundSubmission[] = [
  { correct: true },
  { correct: true },
  { correct: false },
  { correct: true },
  { correct: true },
  { correct: true },
];
const SAMPLE_STATE = applyRound(applyRound(initClassBattle(100), SAMPLE_ROUND), SAMPLE_ROUND);
const SAMPLE_PROGRESS = classProgress(SAMPLE_STATE);

export default function ClassBattlePage() {
  const backend = readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return (
    <AppShell pageClassName="learn-page">
      <main id="main-content" tabIndex={-1} className="learn-main">
        <Link className="back-link" href="/learn">
          <ArrowLeft aria-hidden="true" />回自學小站
        </Link>

        <header className="learn-head">
          <p className="eyebrow">自學・全班協力</p>
          <h1>全班協力對戰</h1>
          <p className="learn-sub">
            全班一起答題，把同一個關卡的能量填滿——這是<strong>合作</strong>，不是互相比名次。畫面只顯示全班的集體進度與參與人數，不公開、也不排名任何人的個別成績。
          </p>
        </header>

        <section className="class-battle-demo" aria-label="玩法示意">
          <p className="class-battle-demo-label">
            <Users aria-hidden="true" />玩法示意（範例，非真實班級資料）
          </p>
          <div
            className="class-battle-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={SAMPLE_PROGRESS}
            aria-label="全班能量進度示意"
          >
            <span className="class-battle-fill" style={{ width: `${SAMPLE_PROGRESS}%` }} />
          </div>
          <p className="class-battle-demo-caption">
            全班集體能量 {SAMPLE_PROGRESS}%。每個人答對就替全班加能量，填滿就一起通關。
          </p>
        </section>

        {backend ? (
          <section className="classroom-setup-gate">
            <span className="setup-gate-icon" aria-hidden="true">
              <Cable />
            </span>
            <p className="eyebrow">全班即時對戰</p>
            <h2>即時後端已連線</h2>
            <p>
              全班即時協力房將在此開放。合作計分邏輯已備妥，等老師從課堂後端開場即可加入。
            </p>
          </section>
        ) : (
          <section className="classroom-setup-gate">
            <span className="setup-gate-icon" aria-hidden="true">
              <Cable />
            </span>
            <p className="eyebrow">全班即時安全閘門</p>
            <h2>即時後端尚未連線</h2>
            <p>
              全班即時對戰需要跨裝置的即時後端。後端尚未連線前不會開場，也<strong>不會顯示任何假的班級進度或人數</strong>——上面只是玩法示意。
            </p>
            <div className="setup-gate-note">
              <ShieldAlert aria-hidden="true" />
              <span>
                想單機練習可先玩「積分挑戰」或「兩兩對戰」；合作計分邏輯已寫好並通過測試，等連上後端就能即時開場。
              </span>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
