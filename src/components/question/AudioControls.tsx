"use client";

import { Gauge, Volume2 } from "lucide-react";
import { useId, useState } from "react";

export function AudioControls({
  transcript,
  onRevealTranscript,
}: {
  transcript: string;
  onRevealTranscript?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const transcriptId = useId();

  function toggleTranscript() {
    const nextVisible = !transcriptVisible;
    setTranscriptVisible(nextVisible);
    if (nextVisible) onRevealTranscript?.();
  }

  function play(rate: number) {
    if (!("speechSynthesis" in window)) {
      setMessage("這個瀏覽器無法播放語音；請開啟文字輔助繼續作答。");
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
      <small id={`${transcriptId}-help`}>
        無法使用聲音時再開啟；文字版可能包含作答線索。
      </small>
      <button
        aria-controls={transcriptId}
        aria-describedby={`${transcriptId}-help`}
        aria-expanded={transcriptVisible}
        className="secondary-button"
        type="button"
        onClick={toggleTranscript}
      >
        {transcriptVisible ? "隱藏文字輔助" : "顯示文字輔助"}
      </button>
      {transcriptVisible ? (
        <div className="explanation-box" id={transcriptId}>
          <strong>聽力內容文字版</strong>
          <p lang="en">{transcript}</p>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
