"use client";

import { Gauge, Headphones, Volume2 } from "lucide-react";
import { useId, useState } from "react";
import { pickBestVoice } from "@/domain/audio/voice-source";
import styles from "./AudioControls.module.css";

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

  // 瀏覽器合成語音品質不一，缺語音包的舊裝置甚至完全聽不清楚；至少從裝置
  // 實際安裝的聲音裡挑聽得懂的（避開 Albert/Bells 這類玩具音）。不外連任何
  // 第三方服務——避免把學生正在看的內容明碼送到外部網域。
  function play(rate: number, isSlow: boolean) {
    if (!("speechSynthesis" in window)) {
      setMessage("這個瀏覽器無法播放語音；請開啟文字輔助繼續作答。");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const bestVoice = pickBestVoice(window.speechSynthesis.getVoices());
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // 有些裝置（尤其缺語音包的舊平板／WebView）呼叫 speak() 後不會真的發出
    // 聲音，也不一定會觸發 error 事件——單純樂觀顯示「正在播放」會讓學生
    // 誤以為自己沒聽到是不專心。這裡實際監聽 onstart/onend/onerror，並用
    // 逾時偵測沒有任何事件觸發的靜默失敗，主動提醒改用文字輔助。
    let started = false;
    utterance.onstart = () => {
      started = true;
      setMessage(isSlow ? "正在慢速播放" : "正在正常速度播放");
    };
    utterance.onend = () => {
      setMessage("播放完成。沒聽清楚可以再播一次，或打開文字輔助。");
    };
    utterance.onerror = () => {
      setMessage("這次沒有成功發出聲音，建議打開文字輔助繼續作答。");
    };

    setMessage(isSlow ? "正在準備慢速播放…" : "正在準備播放…");
    window.speechSynthesis.speak(utterance);
    window.setTimeout(() => {
      if (!started) {
        setMessage("好像沒有聲音播出來，建議打開文字輔助繼續作答。");
      }
    }, 2500);
  }

  return (
    <div className={`audio-controls ${styles.panel}`}>
      <div role="group" aria-label="播放聽力內容">
        <p className={styles.groupLabel}>
          <Headphones aria-hidden="true" />
          先聽一聽
        </p>
        <div className={styles.playRow}>
          <button className="secondary-button" type="button" onClick={() => play(0.9, false)}>
            <Volume2 aria-hidden="true" />
            正常播放
          </button>
          <button className="secondary-button" type="button" onClick={() => play(0.62, true)}>
            <Gauge aria-hidden="true" />
            慢速播放
          </button>
        </div>
      </div>
      <div className={styles.supportRow}>
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
      </div>
      {transcriptVisible ? (
        <div className="explanation-box" id={transcriptId}>
          <strong>聽力內容文字版</strong>
          <p lang="en">{transcript}</p>
        </div>
      ) : null}
      {message ? (
        <p className={styles.status} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
