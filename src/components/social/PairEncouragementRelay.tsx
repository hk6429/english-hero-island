"use client";

import { HandHeart, LockKeyhole, MailOpen, UsersRound } from "lucide-react";
import { useState } from "react";

const encouragementChoices = [
  "我看見你有先自己想，再決定要不要用提示。",
  "你願意答錯後再試一次，這份勇氣很重要。",
  "你找到適合自己的方法了，下次也可以慢慢來。",
] as const;

type RelayStage = "intro" | "partner" | "sealed" | "revealed";

export function PairEncouragementRelay({
  onReceive,
}: {
  onReceive: (message: string) => void;
}) {
  const [stage, setStage] = useState<RelayStage>("intro");
  const [selected, setSelected] = useState<string | null>(null);

  if (stage === "intro") {
    return (
      <section className="pair-relay relay-intro" aria-labelledby="pair-relay-title">
        <UsersRound aria-hidden="true" />
        <div>
          <p className="eyebrow">真人同桌模式・可選</p>
          <h2 id="pair-relay-title">讓身旁學伴留下一張不排名的鼓勵卡</h2>
          <p>同一台裝置交接，不輸入姓名，也不顯示彼此分數或錯題。</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setStage("partner")}>
          開啟同桌鼓勵接力
        </button>
      </section>
    );
  }

  if (stage === "partner") {
    return (
      <section className="pair-relay relay-partner" aria-labelledby="partner-handoff-title">
        <HandHeart aria-hidden="true" />
        <div className="relay-copy">
          <p className="eyebrow">學伴回合</p>
          <h2 id="partner-handoff-title">請把畫面交給身旁學伴</h2>
          <p>請學伴只選一句真實看見的學習行為，不比較速度，也不評分。</p>
          <div className="encouragement-choice-grid" aria-label="學伴鼓勵句">
            {encouragementChoices.map((message) => (
              <button
                className={selected === message ? "selected" : ""}
                type="button"
                aria-pressed={selected === message}
                key={message}
                onClick={() => setSelected(message)}
              >
                {message}
              </button>
            ))}
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onReceive(selected);
              setStage("sealed");
            }}
          >
            <LockKeyhole aria-hidden="true" />
            封好鼓勵卡，交還給英雄
          </button>
        </div>
      </section>
    );
  }

  if (stage === "sealed") {
    return (
      <section className="pair-relay relay-sealed" aria-label="已封好的夥伴鼓勵卡">
        <LockKeyhole aria-hidden="true" />
        <div>
          <p className="eyebrow">畫面已遮住內容</p>
          <h2>英雄，可以把裝置拿回來了。</h2>
          <p>鼓勵卡只存於這個瀏覽器，不會建立學伴資料。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setStage("revealed")}>
          <MailOpen aria-hidden="true" />
          打開夥伴鼓勵
        </button>
      </section>
    );
  }

  return (
    <section className="pair-relay relay-revealed" aria-live="polite">
      <HandHeart aria-hidden="true" />
      <div>
        <p className="eyebrow">身旁學伴想告訴你</p>
        <h2>{selected}</h2>
        <p>這張卡已收入你的本機收藏；它肯定學習行為，不代表分數或能力排名。</p>
      </div>
    </section>
  );
}
