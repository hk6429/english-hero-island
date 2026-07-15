import { isSoundEnabled } from "./sound-settings";

export type ChimeKind = "correct" | "boss-victory";

export type ChimeNote = Readonly<{ frequency: number; start: number; duration: number }>;

// 全部用 Web Audio 現場合成，不掛任何音檔資源，答對是單音、Boss 勝利是三音上行小旋律。
const CHIME_NOTES: Readonly<Record<ChimeKind, readonly ChimeNote[]>> = {
  correct: [{ frequency: 880, start: 0, duration: 0.14 }],
  "boss-victory": [
    { frequency: 660, start: 0, duration: 0.14 },
    { frequency: 880, start: 0.13, duration: 0.14 },
    { frequency: 1108, start: 0.26, duration: 0.26 },
  ],
};

export function chimeNotes(kind: ChimeKind): readonly ChimeNote[] {
  return CHIME_NOTES[kind];
}

type AudioContextLike = Pick<AudioContext, "currentTime" | "createOscillator" | "createGain" | "destination" | "close">;

function resolveAudioContextConstructor(): (new () => AudioContextLike) | null {
  if (typeof window === "undefined") return null;
  const withWebkit = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return withWebkit.AudioContext ?? withWebkit.webkitAudioContext ?? null;
}

export function playChime(kind: ChimeKind): void {
  if (!isSoundEnabled()) return;

  const AudioContextCtor = resolveAudioContextConstructor();
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const notes = chimeNotes(kind);
  const now = context.currentTime;

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, now + note.start);
    gain.gain.exponentialRampToValueAtTime(0.2, now + note.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + note.start);
    oscillator.stop(now + note.start + note.duration + 0.02);
  }

  const totalDuration = Math.max(...notes.map((note) => note.start + note.duration)) + 0.1;
  window.setTimeout(() => {
    void context.close();
  }, totalDuration * 1000);
}
