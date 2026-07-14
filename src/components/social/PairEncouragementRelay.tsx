"use client";

import { HandHeart, LockKeyhole, MailOpen, UsersRound } from "lucide-react";
import { useState } from "react";

type RelayStage = "intro" | "sealed" | "revealed" | "complete";

const APPLICATION_RESPONSES = [
  "下一題先找一個關鍵線索",
  "下一題先排除一個不合的選項",
  "下一題先把題目拆成兩個小步驟",
] as const;

export function PairEncouragementRelay({
  strategyName,
  strategyMessage,
  repairCount,
  onReceive,
}: {
  strategyName: string;
  strategyMessage: string;
  repairCount: number;
  onReceive: (message: string, applicationResponse: string) => void;
}) {
  const [stage, setStage] = useState<RelayStage>("intro");
  const [applicationResponse, setApplicationResponse] = useState("");

  if (stage === "intro") {
    return (
      <section className="pair-relay relay-intro" aria-labelledby="pair-relay-title">
        <UsersRound aria-hidden="true" />
        <div>
          <p className="eyebrow">真人同桌模式・可選</p>
          <h2 id="pair-relay-title">把剛才有效的方法留給下一位學伴</h2>
          <p>
            你要交出的策略是「{strategyName}」：{strategyMessage}
          </p>
          <p>這台裝置已完成 {repairCount} 次真人策略接力。</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setStage("sealed")}>
          封存我的方法，交給下一位
        </button>
      </section>
    );
  }

  if (stage === "sealed") {
    return (
      <section className="pair-relay relay-sealed" aria-labelledby="partner-handoff-title">
        <LockKeyhole aria-hidden="true" />
        <div>
          <p className="eyebrow">方法已封存</p>
          <h2 id="partner-handoff-title">請把裝置交給下一位學伴</h2>
          <p>內容已遮住；不輸入姓名，也不顯示彼此分數、速度或錯題。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setStage("revealed")}>
          <MailOpen aria-hidden="true" />
          我是下一位學伴，打開方法
        </button>
      </section>
    );
  }

  if (stage === "revealed") {
    return (
      <section className="pair-relay relay-partner" aria-labelledby="received-strategy-title">
        <HandHeart aria-hidden="true" />
        <div>
          <p className="eyebrow">上一位學伴留下的方法</p>
          <h2 id="received-strategy-title">{strategyName}</h2>
          <p>{strategyMessage}</p>
          <div className="relay-response" role="group" aria-labelledby="relay-response-title">
            <h3 id="relay-response-title">我會怎麼使用這個方法？</h3>
            <p>選一個下一題真的做得到的小行動，回傳給上一位學伴。</p>
            <div className="relay-response-options">
              {APPLICATION_RESPONSES.map((response) => (
                <label key={response}>
                  <input
                    type="radio"
                    name="relay-application"
                    value={response}
                    checked={applicationResponse === response}
                    onChange={() => setApplicationResponse(response)}
                  />
                  <span>{response}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!applicationResponse}
          onClick={() => {
            if (!applicationResponse) return;
            onReceive(`${strategyName}：${strategyMessage}`, applicationResponse);
            setStage("complete");
          }}
        >
          <HandHeart aria-hidden="true" />
          回傳我的用法，完成共同修復
        </button>
      </section>
    );
  }

  return (
    <section className="pair-relay relay-revealed" aria-live="polite">
      <HandHeart aria-hidden="true" />
      <div>
        <p className="eyebrow">真人收件已確認</p>
        <h2>共同修復 +1</h2>
        <p>下一位學伴的回覆：{applicationResponse}</p>
        <p>策略卡只存於這個瀏覽器，不建立學伴資料，也不代表分數或能力排名。</p>
      </div>
    </section>
  );
}
