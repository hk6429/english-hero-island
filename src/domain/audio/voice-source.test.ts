import { describe, expect, it } from "vitest";
import { pickBestVoice, scoreVoice } from "./voice-source";

function voice(name: string, overrides: Partial<{ lang: string; default: boolean; localService: boolean }> = {}) {
  return { name, lang: "en-US", default: false, localService: false, ...overrides };
}

describe("scoreVoice", () => {
  it("scores known toy voices below zero", () => {
    expect(scoreVoice(voice("Albert"))).toBeLessThan(0);
    expect(scoreVoice(voice("Bells"))).toBeLessThan(0);
  });

  it("scores known clear voices above a plain default voice", () => {
    expect(scoreVoice(voice("Samantha"))).toBeGreaterThan(scoreVoice(voice("Some Other Voice")));
  });

  it("rewards natural/neural/premium/enhanced labelling", () => {
    expect(scoreVoice(voice("Ava (Premium)"))).toBeGreaterThan(scoreVoice(voice("Ava")));
  });
});

describe("pickBestVoice", () => {
  it("prefers a known-good voice over a toy voice among English candidates", () => {
    const best = pickBestVoice([voice("Bells"), voice("Samantha"), voice("Bad News")]);
    expect(best?.name).toBe("Samantha");
  });

  it("ignores non-English voices entirely", () => {
    const best = pickBestVoice([voice("Samantha", { lang: "fr-FR" }), voice("Daniel", { lang: "en-GB" })]);
    expect(best?.name).toBe("Daniel");
  });

  it("returns null when every candidate is a toy voice", () => {
    expect(pickBestVoice([voice("Albert"), voice("Zarvox")])).toBeNull();
  });

  it("returns null when there are no voices at all", () => {
    expect(pickBestVoice([])).toBeNull();
  });
});
