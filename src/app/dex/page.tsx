"use client";

import { ArrowLeft, BookOpenCheck, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import { deriveMastery } from "@/domain/mastery/derive-mastery";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { FOCUS_MICRO_SKILL, microSkillLabel } from "@/features/adventure/content-map";

export default function DexPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const profile = progress.profile;

  useEffect(() => {
    if (ready && !profile) router.replace("/start");
  }, [profile, ready, router]);

  if (!ready || !profile) {
    return (
      <AppShell>
        <main id="main-content" className="page-main">
          <p className="loading-state">正在翻開能力圖鑑……</p>
        </main>
      </AppShell>
    );
  }

  const focus = FOCUS_MICRO_SKILL[profile.grade];
  const mastery = deriveMastery(focus, progress.events);
  const collected = progress.dexEntries.includes(focus);

  return (
    <AppShell pageClassName="dex-page">
      <main id="main-content" className="page-main narrow-main">
        <button
          className="back-link back-button"
          type="button"
          onClick={() => {
            dispatch({ type: "return_to_island" });
            router.push("/island");
          }}
        >
          <ArrowLeft aria-hidden="true" /> 回能力島
        </button>

        <section className="dex-header">
          <HeroGlyph heroId={profile.heroId} size="large" />
          <div>
            <p className="eyebrow">{profile.nickname} 的收藏</p>
            <h1>能力圖鑑</h1>
            <p>收藏的是可說明的學習能力，不是一次答對的勳章。</p>
          </div>
          <span className="dex-count">{progress.dexEntries.length} 張</span>
        </section>

        <section className="ability-card-grid" aria-label="能力卡收藏">
          <article className={`ability-card ${collected ? "collected" : "locked"}`}>
            <div className="ability-card-art" aria-hidden="true">
              {collected ? <Sparkles /> : <LockKeyhole />}
            </div>
            <p className="eyebrow">{profile.grade} 年級主線</p>
            <h2>{microSkillLabel(focus)}</h2>
            <p>
              {collected
                ? "已完成一場完整任務，能力卡進入確認階段。"
                : "完成今日任務後，這張能力卡會加入圖鑑。"}
            </p>
            <dl>
              <div>
                <dt>能力狀態</dt>
                <dd>{mastery.status === "mastered" ? "已精熟" : collected ? "待確認" : "未取得"}</dd>
              </div>
              <div>
                <dt>不同日期</dt>
                <dd>{mastery.independentDates.length}／2</dd>
              </div>
              <div>
                <dt>不同表面題</dt>
                <dd>{mastery.independentSurfaces}／2</dd>
              </div>
            </dl>
            {collected ? (
              <span className="card-earned">
                <CheckCircle2 aria-hidden="true" /> 已收入圖鑑
              </span>
            ) : null}
          </article>

          <article className="ability-card future-card">
            <div className="ability-card-art" aria-hidden="true">
              <BookOpenCheck />
            </div>
            <p className="eyebrow">後續擴充</p>
            <h2>更多微技能卡</h2>
            <p>正式題庫通過雙人複核後，其他能力區會依序開放。</p>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
