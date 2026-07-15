import type { Grade } from "@/domain/questions/question-schema";

/**
 * 自學小遊戲（閃卡／記憶牌／連連看）共用詞庫。
 *
 * 內容性質：**基礎單字的事實字義**（如 cat=貓），非治理題庫、非考題。核心單字錨定
 * 題庫既有正解字（見 src/content/pilot、review-candidates），再以國小學習扶助核心
 * 常用字補齊，全部為辭典事實義，不涉及捏造題目或教師身分。glosses 一律繁體中文。
 */
export type VocabPair = Readonly<{
  en: string;
  zh: string;
  emoji: string;
  grade: Grade;
}>;

export const VOCAB_PAIRS: readonly VocabPair[] = [
  // 三年級：CVC／基礎名詞、動物、自然（核心錨定題庫 cat/dog/pig/hen/sun/map/hat/bed/fan）
  { en: "cat", zh: "貓", emoji: "🐱", grade: 3 },
  { en: "dog", zh: "狗", emoji: "🐶", grade: 3 },
  { en: "pig", zh: "豬", emoji: "🐷", grade: 3 },
  { en: "hen", zh: "母雞", emoji: "🐔", grade: 3 },
  { en: "sun", zh: "太陽", emoji: "☀️", grade: 3 },
  { en: "map", zh: "地圖", emoji: "🗺️", grade: 3 },
  { en: "hat", zh: "帽子", emoji: "🎩", grade: 3 },
  { en: "bed", zh: "床", emoji: "🛏️", grade: 3 },
  { en: "fan", zh: "扇子", emoji: "🪭", grade: 3 },
  { en: "bus", zh: "公車", emoji: "🚌", grade: 3 },
  { en: "cup", zh: "杯子", emoji: "🥤", grade: 3 },
  { en: "bag", zh: "書包", emoji: "🎒", grade: 3 },

  // 四年級：學校與居家物品、動物（錨定 pen/pan/rug/log/dog/cat）
  { en: "pen", zh: "筆", emoji: "🖊️", grade: 4 },
  { en: "pan", zh: "平底鍋", emoji: "🍳", grade: 4 },
  { en: "rug", zh: "小地毯", emoji: "🧶", grade: 4 },
  { en: "log", zh: "圓木", emoji: "🪵", grade: 4 },
  { en: "book", zh: "書", emoji: "📖", grade: 4 },
  { en: "desk", zh: "書桌", emoji: "🪑", grade: 4 },
  { en: "milk", zh: "牛奶", emoji: "🥛", grade: 4 },
  { en: "fish", zh: "魚", emoji: "🐟", grade: 4 },
  { en: "bird", zh: "鳥", emoji: "🐦", grade: 4 },
  { en: "cake", zh: "蛋糕", emoji: "🍰", grade: 4 },
  { en: "ball", zh: "球", emoji: "⚽", grade: 4 },
  { en: "door", zh: "門", emoji: "🚪", grade: 4 },

  // 五年級：形容詞、食物、天氣（錨定 cloudy/quiet/soft/tall/tiny/noodles）
  { en: "cloudy", zh: "多雲的", emoji: "☁️", grade: 5 },
  { en: "quiet", zh: "安靜的", emoji: "🤫", grade: 5 },
  { en: "soft", zh: "柔軟的", emoji: "🧸", grade: 5 },
  { en: "tall", zh: "高的", emoji: "📏", grade: 5 },
  { en: "tiny", zh: "微小的", emoji: "🐜", grade: 5 },
  { en: "noodles", zh: "麵", emoji: "🍜", grade: 5 },
  { en: "rice", zh: "米飯", emoji: "🍚", grade: 5 },
  { en: "happy", zh: "快樂的", emoji: "😄", grade: 5 },
  { en: "hungry", zh: "飢餓的", emoji: "🍽️", grade: 5 },
  { en: "sunny", zh: "晴朗的", emoji: "🌞", grade: 5 },
  { en: "windy", zh: "有風的", emoji: "🍃", grade: 5 },
  { en: "long", zh: "長的", emoji: "📐", grade: 5 },

  // 六年級：職業、地點、動作（錨定 doctor/library/reading）
  { en: "doctor", zh: "醫生", emoji: "🩺", grade: 6 },
  { en: "teacher", zh: "老師", emoji: "👩‍🏫", grade: 6 },
  { en: "nurse", zh: "護理師", emoji: "💉", grade: 6 },
  { en: "farmer", zh: "農夫", emoji: "🌾", grade: 6 },
  { en: "library", zh: "圖書館", emoji: "📚", grade: 6 },
  { en: "hospital", zh: "醫院", emoji: "🏥", grade: 6 },
  { en: "school", zh: "學校", emoji: "🏫", grade: 6 },
  { en: "park", zh: "公園", emoji: "🌳", grade: 6 },
  { en: "market", zh: "市場", emoji: "🛒", grade: 6 },
  { en: "reading", zh: "閱讀", emoji: "📖", grade: 6 },
  { en: "cooking", zh: "烹飪", emoji: "🍳", grade: 6 },
  { en: "running", zh: "跑步", emoji: "🏃", grade: 6 },
];

export function vocabByGrade(grade: Grade): VocabPair[] {
  return VOCAB_PAIRS.filter((pair) => pair.grade === grade);
}
