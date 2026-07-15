"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/domain/audio/sound-settings";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  return (
    <button
      className="sound-toggle"
      type="button"
      aria-pressed={enabled}
      onClick={() => {
        const next = !enabled;
        setSoundEnabled(next);
        setEnabled(next);
      }}
    >
      {enabled ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
      <span className="sr-only">{enabled ? "音效已開啟，點一下關閉" : "音效已關閉，點一下開啟"}</span>
    </button>
  );
}
