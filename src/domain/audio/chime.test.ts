import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chimeNotes, playChime } from "./chime";
import { setSoundEnabled } from "./sound-settings";

function stubAudioContext() {
  const oscillators: Array<{ type: string; frequency: { value: number }; started: number[]; stopped: number[] }> = [];

  class StubGainParam {
    value = 0;
    setValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
  }

  class StubOscillator {
    type = "sine";
    frequency = { value: 0 };
    connect = vi.fn();
    start = vi.fn((time: number) => this.startedAt.push(time));
    stop = vi.fn((time: number) => this.stoppedAt.push(time));
    startedAt: number[] = [];
    stoppedAt: number[] = [];
    constructor() {
      oscillators.push({
        type: this.type,
        frequency: this.frequency,
        started: this.startedAt,
        stopped: this.stoppedAt,
      });
    }
  }

  class StubGain {
    gain = new StubGainParam();
    connect = vi.fn();
  }

  class StubAudioContext {
    currentTime = 0;
    destination = {};
    close = vi.fn();
    createOscillator() {
      return new StubOscillator();
    }
    createGain() {
      return new StubGain();
    }
  }

  vi.stubGlobal("AudioContext", StubAudioContext);
  return oscillators;
}

describe("chimeNotes", () => {
  it("plays a single note for a correct answer", () => {
    expect(chimeNotes("correct")).toHaveLength(1);
  });

  it("plays a rising three-note flourish for a boss victory", () => {
    const notes = chimeNotes("boss-victory");
    expect(notes).toHaveLength(3);
    expect(notes[0].frequency).toBeLessThan(notes[1].frequency);
    expect(notes[1].frequency).toBeLessThan(notes[2].frequency);
  });
});

describe("playChime", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("does nothing when the student has not opted into sound", () => {
    const oscillators = stubAudioContext();
    playChime("correct");
    expect(oscillators).toHaveLength(0);
  });

  it("plays one oscillator per note once sound is enabled", () => {
    setSoundEnabled(true);
    const oscillators = stubAudioContext();

    playChime("boss-victory");

    expect(oscillators).toHaveLength(3);
    expect(oscillators.every((oscillator) => oscillator.started.length === 1)).toBe(true);
  });
});
