/**
 * 從瀏覽器內建語音合成裡挑出聽得懂的聲音，避開 Albert/Bells 這類玩具音效聲。
 * 只用瀏覽器本機語音、不外連任何第三方服務——避免把學生正在看的內容明碼
 * 送到外部網域。挑聲清單沿用字鬥英雄（vocab-duel）js/speak.js 已在正式站
 * 驗證過的名單。
 */

const GOOD_VOICE_HINTS = [
  "google us english",
  "google uk english female",
  "google uk english male",
  "samantha",
  "ava",
  "allison",
  "susan",
  "zoe",
  "evan",
  "nathan",
  "joelle",
  "daniel",
  "kate",
  "serena",
  "stephanie",
  "jamie",
  "oliver",
  "microsoft aria",
  "microsoft jenny",
  "microsoft guy",
  "microsoft zira",
  "microsoft sonia",
  "microsoft libby",
  "microsoft ryan",
  "karen",
  "moira",
  "tessa",
];

const BAD_VOICE_HINTS = [
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "deranged",
  "good news",
  "jester",
  "organ",
  "superstar",
  "trinoids",
  "whisper",
  "wobble",
  "zarvox",
  "grandma",
  "grandpa",
  "junior",
  "ralph",
  "fred",
  "kathy",
  "eddy",
  "flo",
  "reed",
  "rocko",
  "sandy",
  "shelley",
  "novelty",
];

export type VoiceLike = Readonly<{
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}>;

export function scoreVoice(voice: VoiceLike): number {
  const name = voice.name.toLowerCase();
  if (BAD_VOICE_HINTS.some((bad) => name.includes(bad))) {
    return -1;
  }
  let score = 0;
  const goodIndex = GOOD_VOICE_HINTS.findIndex((good) => name.includes(good));
  if (goodIndex >= 0) {
    score += 1000 - goodIndex;
  }
  if (/natural|neural|premium|enhanced/.test(name)) {
    score += 500;
  }
  if (voice.lang.replace("_", "-").toLowerCase().startsWith("en")) {
    score += 100;
  }
  if (voice.default) {
    score += 10;
  }
  if (voice.localService) {
    score += 5;
  }
  return score;
}

export function pickBestVoice<Voice extends VoiceLike>(voices: readonly Voice[]): Voice | null {
  const candidates = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const best = [...candidates].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  if (!best) {
    return null;
  }
  return scoreVoice(best) >= 0 ? best : null;
}
