import type { Grade, Skill } from "@/domain/questions/question-schema";
import type {
  HeroAccent,
  HeroId,
  HintTool,
  MissionRoute,
} from "@/infrastructure/progress/progress-types";

export const FOCUS_MICRO_SKILL: Readonly<Record<Grade, string>> = {
  3: "cvc-decoding",
  4: "yes-no-questions",
  5: "age-and-can",
  6: "present-progressive",
};

export const FOCUS_SKILL: Readonly<Record<Grade, Skill>> = {
  3: "phonics",
  4: "classroom_english",
  5: "grammar",
  6: "grammar",
};

export const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  letters: "字母港",
  phonics: "拼讀森林",
  vocabulary: "字詞花園",
  classroom_english: "對話小鎮",
  grammar: "句型工坊",
  comprehension: "理解燈塔",
};

export const MICRO_SKILL_LABELS: Readonly<Record<string, string>> = {
  "uppercase-lowercase": "大小寫辨識",
  "letter-listening": "字母聽辨",
  "letter-writing": "字母書寫",
  "phonological-awareness": "起始音辨識",
  "cvc-decoding": "CVC 拼讀",
  "image-sentence-match": "圖句配對",
  "affirmative-negative": "肯定與否定句",
  "this-that-questions": "this／that 問答",
  "yes-no-questions": "Yes／No 問答",
  "weather-listening": "天氣聽力",
  "image-sentence-meaning": "圖句理解",
  adjectives: "常用形容詞",
  "age-and-can": "年齡與 can 句型",
  "short-dialogue": "短對話理解",
  "place-and-destination": "地點與去向",
  "present-progressive": "現在進行式",
  "clothing-and-have": "衣物與 have",
  "occupation-and-family": "職業與家庭",
  "integrated-dialogue-text": "整合對話短文",
};

export const HEROES: ReadonlyArray<{
  id: HeroId;
  name: string;
  title: string;
  description: string;
}> = [
  {
    id: "wave-scout",
    name: "小浪",
    title: "海風偵察員",
    description: "善用聲音線索，找出藏在字母裡的路。",
  },
  {
    id: "forest-keeper",
    name: "小森",
    title: "森林守護員",
    description: "喜歡拆開單字，再一步一步接回來。",
  },
  {
    id: "star-smith",
    name: "小星",
    title: "星光鍛造師",
    description: "用例句打造句型，讓能力卡發亮。",
  },
];

export const HINT_TOOLS: ReadonlyArray<{
  id: HintTool;
  name: string;
  description: string;
}> = [
  { id: "sound-lens", name: "聲音透鏡", description: "先聽關鍵音，再排除不相符的選項。" },
  { id: "word-bridge", name: "拆字橋", description: "把單字或句子拆成小段，一段一段接起來。" },
  { id: "example-card", name: "例句卡", description: "先看一個相似例子，再回到這一題。" },
];

export const HERO_ACCENTS: ReadonlyArray<{
  id: HeroAccent;
  name: string;
  description: string;
}> = [
  { id: "ocean", name: "潮汐藍", description: "沉著觀察" },
  { id: "coral", name: "珊瑚橘", description: "勇敢嘗試" },
  { id: "gold", name: "星光金", description: "耐心連結" },
];

export const MISSION_ROUTES: ReadonlyArray<{
  id: MissionRoute;
  name: string;
  description: string;
  effect: string;
}> = [
  {
    id: "steady-bridge",
    name: "穩步橋",
    description: "每一回合看見一個可執行的小步驟。",
    effect: "適合想先整理方法，再逐題前進的英雄。",
  },
  {
    id: "story-trail",
    name: "探索徑",
    description: "每一回合揭開一段島嶼故事線索。",
    effect: "適合想沿著故事，好奇下一段會出現什麼的英雄。",
  },
];

export const MISSION_COPY: Readonly<Record<Grade, { place: string; title: string; story: string }>> = {
  3: {
    place: "拼讀森林",
    title: "找回三音石",
    story: "森林小徑被散落的字母音擋住了。把三個聲音接起來，讓溪流重新前進。",
  },
  4: {
    place: "對話小鎮",
    title: "修好回應鐘",
    story: "小鎮的回應鐘只會問問題，卻聽不懂回答。找出合適的 Yes／No 回應，讓鐘聲回來。",
  },
  5: {
    place: "句型工坊",
    title: "重啟能力齒輪",
    story: "工坊需要年齡密碼與 can 能力句型才能運轉。完成任務，把兩組齒輪重新接上。",
  },
  6: {
    place: "理解燈塔",
    title: "點亮現在之光",
    story: "燈塔要知道大家此刻正在做什麼。用現在進行式找出動作，讓光束照亮航道。",
  },
};

export function microSkillLabel(microSkill: string): string {
  return MICRO_SKILL_LABELS[microSkill] ?? microSkill;
}
