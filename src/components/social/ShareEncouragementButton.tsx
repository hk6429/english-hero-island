"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareEncouragementButton({ abilityLabel }: { abilityLabel: string }) {
  const [message, setMessage] = useState("");
  const text = `我剛完成「${abilityLabel}」英語任務。想把這句送給一起學習的人：慢慢來，每一次用方法完成都算進步。`;

  async function shareEncouragement() {
    const payload = { title: "英語英雄島鼓勵卡", text };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        setMessage("鼓勵卡已交給分享面板，由你決定要傳給誰。");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage("鼓勵卡文字已複製，你可以自己選擇要貼給誰。");
        return;
      }

      setMessage("這個瀏覽器暫時不能分享；你的任務紀錄仍完整保留。");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("已取消分享；鼓勵卡沒有傳出去。");
        return;
      }
      setMessage("分享面板暫時無法開啟，請稍後再試。");
    }
  }

  return (
    <div className="encouragement-share">
      <button className="secondary-button" type="button" onClick={shareEncouragement}>
        <Share2 aria-hidden="true" />
        分享鼓勵卡
      </button>
      <p className="share-status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
