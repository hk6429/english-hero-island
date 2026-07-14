"use client";

import { Gauge, Volume2 } from "lucide-react";
import { useState } from "react";

export function AudioControls({ transcript }: { transcript: string }) {
  const [message, setMessage] = useState("");

  function play(rate: number) {
    if (!("speechSynthesis" in window)) {
      setMessage("這個瀏覽器無法播放語音，系統會換成非聽力題。");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
    setMessage(rate < 1 ? "正在慢速播放" : "正在正常速度播放");
  }

  return (
    <div className="audio-controls">
      <button className="secondary-button" type="button" onClick={() => play(0.9)}>
        <Volume2 aria-hidden="true" />
        正常播放
      </button>
      <button className="secondary-button" type="button" onClick={() => play(0.62)}>
        <Gauge aria-hidden="true" />
        慢速播放
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
