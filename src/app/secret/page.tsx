"use client";

import { ArrowLeft, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import type { Grade } from "@/domain/questions/question-schema";
import { useAdventure } from "@/features/adventure/AdventureProvider";

type Discovery = Readonly<{
  id: string;
  title: string;
  clue: string;
  english: string;
  story: string;
}>;

const discoveriesByGrade: Readonly<Record<Grade, ReadonlyArray<Discovery>>> = {
  3: [
    {
      id: "g3-constellation-cat",
      title: "短母音星",
      clue: "三個聲音可以接成一個字",
      english: "c-a-t → cat",
      story: "把每個聲音都保留下來，再慢慢加快，就能讀出完整單字。",
    },
    {
      id: "g3-constellation-map",
      title: "地圖星",
      clue: "改變最後一個聲音",
      english: "map → man",
      story: "前兩個聲音相同，只換最後一個聲音，單字就會走向新的意思。",
    },
    {
      id: "g3-constellation-sun",
      title: "太陽星",
      clue: "中間的母音是核心",
      english: "sun has the short u sound.",
      story: "CVC 單字的中間音常是辨認單字的重要線索。",
    },
  ],
  4: [
    {
      id: "g4-constellation-yes",
      title: "回應星",
      clue: "問題與回答要互相對上",
      english: "Is it a cat? Yes, it is.",
      story: "Yes 之後仍要補上主詞和 be 動詞，回應才完整。",
    },
    {
      id: "g4-constellation-this",
      title: "近方星",
      clue: "靠近自己的物品",
      english: "This is my book.",
      story: "this 常用來指靠近說話者的人或物。",
    },
    {
      id: "g4-constellation-that",
      title: "遠方星",
      clue: "離自己較遠的物品",
      english: "That is your bag.",
      story: "that 常用來指離說話者較遠的人或物。",
    },
  ],
  5: [
    {
      id: "g5-constellation-can",
      title: "能力星",
      clue: "can 後面接原形動詞",
      english: "I can swim.",
      story: "can 已經負責表達能力，後面的動詞保持原形。",
    },
    {
      id: "g5-constellation-age",
      title: "年齡星",
      clue: "年齡使用 be 動詞",
      english: "I am ten years old.",
      story: "英文表達年齡時，用 am、is 或 are 連接年齡。",
    },
    {
      id: "g5-constellation-question",
      title: "提問星",
      clue: "把 can 放到句首",
      english: "Can you dance?",
      story: "要詢問能力時，把 can 移到主詞前面就能形成問句。",
    },
  ],
  6: [
    {
      id: "g6-constellation-now",
      title: "此刻星",
      clue: "正在發生的動作",
      english: "She is reading now.",
      story: "be 動詞加上動詞 ing，可以描述此刻正在進行的動作。",
    },
    {
      id: "g6-constellation-they",
      title: "同行星",
      clue: "複數主詞搭配 are",
      english: "They are playing.",
      story: "主詞是 they 時，現在進行式使用 are。",
    },
    {
      id: "g6-constellation-question",
      title: "觀察星",
      clue: "把 be 動詞移到前面",
      english: "Is he running?",
      story: "把 be 動詞放到主詞前面，就能詢問某人是否正在做一件事。",
    },
  ],
};

export default function SecretPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profile = progress.profile;
  const unlocked = progress.repairedZones.length >= 1;

  useEffect(() => {
    if (ready && !profile) router.replace("/start");
  }, [profile, ready, router]);

  if (!ready || !profile) {
    return (
      <AppShell>
        <main id="main-content" className="page-main">
          <p className="loading-state">正在尋找秘境入口……</p>
        </main>
      </AppShell>
    );
  }

  const discoveries = discoveriesByGrade[profile.grade];
  const collectedIds = progress.discoveries ?? [];
  const starlightKeys = progress.starlightKeys ?? 0;
  const selected = discoveries.find(
    (discovery) => discovery.id === selectedId && collectedIds.includes(discovery.id),
  );

  return (
    <AppShell pageClassName="secret-page">
      <main id="main-content" className="page-main narrow-main">
        <Link className="back-link" href="/island">
          <ArrowLeft aria-hidden="true" /> 回能力島
        </Link>

        {!unlocked ? (
          <section className="secret-locked" aria-labelledby="locked-title">
            <LockKeyhole aria-hidden="true" />
            <div>
              <p className="eyebrow">能力門檻</p>
              <h1 id="locked-title">星光秘境還在雲層後面</h1>
              <p>先完成一條今日主線，入口就會出現；這裡不需要付費，也不會限制必學內容。</p>
            </div>
          </section>
        ) : (
          <>
            <section className="secret-hero">
              <HeroGlyph heroId={profile.heroId} accent={profile.accent} size="large" />
              <div>
                <p className="eyebrow">已用能力解鎖</p>
                <h1>星光秘境</h1>
                <p>
                  每個不同學習日完成主線，最多獲得 1 把不會過期或歸零的星鑰。每把揭露一顆，持續學習就能全部收藏；沒有付費或倒數。
                </p>
              </div>
              <div className="secret-inventory" aria-label="星光秘境收藏狀態">
                <span className="starlight-key-count">可用星鑰 {starlightKeys} 把</span>
                <span className="discovery-count">已收藏 {collectedIds.length}</span>
              </div>
            </section>

            <section className="discovery-grid" aria-label="星光探索選擇">
              {discoveries.map((discovery, index) => {
                const collected = collectedIds.includes(discovery.id);
                const canReveal = collected || starlightKeys > 0;
                return (
                  <button
                    className={`discovery-choice ${collected ? "collected" : "mystery"}`}
                    type="button"
                    key={discovery.id}
                    aria-label={
                      collected
                        ? `${discovery.title}，已收藏，可免費重看`
                        : `未知星片 ${index + 1}，${canReveal ? "使用 1 把星鑰揭露" : "目前沒有星鑰"}`
                    }
                    aria-pressed={selectedId === discovery.id}
                    disabled={!canReveal}
                    onClick={() => {
                      if (!collected && starlightKeys === 0) return;
                      setSelectedId(discovery.id);
                      if (!collected) {
                        dispatch({ type: "record_discovery", discoveryId: discovery.id });
                      }
                    }}
                  >
                    <span className="discovery-star" aria-hidden="true">
                      {collected ? <CheckCircle2 /> : <LockKeyhole />}
                    </span>
                    <strong>{collected ? discovery.title : "未知星片"}</strong>
                    <span>
                      {collected
                        ? discovery.clue
                        : canReveal
                          ? "使用 1 把星鑰揭露"
                          : "完成下一個不同學習日即可再獲得星鑰"}
                    </span>
                  </button>
                );
              })}
            </section>

            {selected ? (
              <section className="discovery-reveal" aria-live="polite">
                <span aria-hidden="true">
                  <Sparkles />
                </span>
                <div>
                  <p className="eyebrow">探索發現</p>
                  <h2>{selected.english}</h2>
                  <p>{selected.story}</p>
                  <strong>已收入探索圖鑑</strong>
                  <Link className="text-link discovery-dex-link" href="/dex">
                    查看探索收藏
                  </Link>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </AppShell>
  );
}
