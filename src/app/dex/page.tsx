"use client";

import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  HandHeart,
  LockKeyhole,
  Sparkles,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import { deriveMastery } from "@/domain/mastery/derive-mastery";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { FOCUS_MICRO_SKILL, microSkillLabel } from "@/features/adventure/content-map";
import styles from "./dex.module.css";

const discoveryTitles: Readonly<Record<string, string>> = {
  "g3-constellation-cat": "短母音星",
  "g3-constellation-map": "地圖星",
  "g3-constellation-sun": "太陽星",
  "g4-constellation-yes": "回應星",
  "g4-constellation-this": "近方星",
  "g4-constellation-that": "遠方星",
  "g5-constellation-can": "能力星",
  "g5-constellation-age": "年齡星",
  "g5-constellation-question": "提問星",
  "g6-constellation-now": "此刻星",
  "g6-constellation-they": "同行星",
  "g6-constellation-question": "觀察星",
};

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
        <main id="main-content" className="page-main" tabIndex={-1}>
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
      <main id="main-content" className="page-main narrow-main" tabIndex={-1}>
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
          <HeroGlyph heroId={profile.heroId} accent={profile.accent} size="large" />
          <div>
            <p className="eyebrow">{profile.nickname} 的收藏</p>
            <h1>能力圖鑑</h1>
            <p>收藏的是可說明的學習能力，不是一次答對的勳章。</p>
          </div>
          <span className="dex-count">{progress.dexEntries.length} 張</span>
        </section>

        <section className="ability-card-grid" aria-label="能力卡收藏">
          <article
            className={`ability-card ${collected ? `collected ${styles.collectedCard}` : "locked"}`}
          >
            <div
              className={`ability-card-art ${collected ? styles.collectedArt : styles.pendingArt}`}
              aria-hidden="true"
            >
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
            <div className={`ability-card-art ${styles.pendingArt}`} aria-hidden="true">
              <BookOpenCheck />
            </div>
            <p className="eyebrow">後續擴充</p>
            <h2>更多微技能卡</h2>
            <p>正式題庫通過雙人複核後，其他能力區會依序開放。</p>
          </article>
        </section>

        <section className="exploration-dex" aria-labelledby="exploration-dex-title">
          <div className="section-heading">
            <p className="eyebrow">秘境不是抽獎</p>
            <h2 id="exploration-dex-title">星光探索收藏</h2>
            <p>每一顆星都能找到；這裡只記錄你已經親手打開的知識片段。</p>
            <span className={styles.collectChip}>
              <Star aria-hidden="true" size={16} />
              已收藏 {(progress.discoveries ?? []).length} 顆知識星
            </span>
          </div>
          {(progress.discoveries ?? []).length === 0 ? (
            <p className="empty-collection">完成主線並進入星光秘境，就能收藏第一顆知識星。</p>
          ) : (
            <div className="discovery-entry-grid">
              {(progress.discoveries ?? []).map((discoveryId) => (
                <article className={`discovery-entry ${styles.starEntry}`} key={discoveryId}>
                  <span className={styles.starBadge} aria-hidden="true">
                    <Star />
                  </span>
                  <div>
                    <strong>{discoveryTitles[discoveryId] ?? "未知星片"}</strong>
                    <span>已收入探索圖鑑</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="partner-dex" aria-labelledby="partner-dex-title">
          <div className="section-heading">
            <p className="eyebrow">不公開、不排名</p>
            <h2 id="partner-dex-title">真人策略接力</h2>
            <p>只收藏下一位學伴實際打開並確認收到的策略，不記錄姓名、分數、速度或錯題。</p>
          </div>
          {(progress.partnerEncouragements ?? []).length === 0 ? (
            <p className="empty-collection">完成任務後，可把剛才有效的方法封存給身旁的下一位學伴。</p>
          ) : (
            <div className="partner-entry-grid">
              {(progress.partnerEncouragements ?? []).map((card) => (
                <article className="partner-entry" key={card.id}>
                  <HandHeart aria-hidden="true" />
                  <div>
                    <p>{card.message}</p>
                    {card.applicationResponse ? (
                      <p className="partner-response">
                        下一位學伴會這樣用：<strong>{card.applicationResponse}</strong>
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
