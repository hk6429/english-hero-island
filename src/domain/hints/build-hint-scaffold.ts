import type { Question } from "@/domain/questions/question-schema";

export type HintScaffoldTool = "sound-lens" | "word-bridge" | "example-card";

export type HintScaffold = Readonly<{
  clue: string;
  feedback: string;
}>;

export function buildHintScaffold(
  question: Question,
  tool: HintScaffoldTool,
): HintScaffold {
  const soundUnits = question.prompt.match(/\/[^/]+\//g) ?? [];

  switch (tool) {
    case "sound-lens":
      return {
        clue: buildSoundLensClue(question, soundUnits),
        feedback: "你最後使用「聲音透鏡」：先隔離關鍵音再比對選項，幫你避免只看拼字猜答案。",
      };
    case "word-bridge":
      return {
        clue: buildWordBridgeClue(question, soundUnits),
        feedback: "你最後使用「拆字橋」：把題幹拆成可檢查的小步驟，幫你逐段確認條件。",
      };
    case "example-card":
      return {
        clue: buildExampleCardClue(question),
        feedback: "你最後使用「例句卡」：先在不同例子練一次同樣規則，幫你把方法遷移回本題。",
      };
  }
}

function buildSoundLensClue(question: Question, soundUnits: readonly string[]): string {
  if (soundUnits.length >= 2) {
    return `只聽聲音：依序念 ${soundUnits.join(" → ")}，先不要看完整單字；再逐一念選項，排除中間音或尾音不同的字。`;
  }

  if (question.audio) {
    return "第一遍先不看選項，只聽被加重或重複的天氣、時間或動作字；第二遍再聽一次，用關鍵音排除不相符的選項。";
  }

  return "把題幹慢慢讀出聲，先聽問句開頭與關鍵字尾；接著逐一朗讀選項，排除聲音或語型接不起來的項目。";
}

function buildWordBridgeClue(question: Question, soundUnits: readonly string[]): string {
  if (soundUnits.length >= 3) {
    return `步驟 1：先接 ${soundUnits[0]} + ${soundUnits[1]}。步驟 2：再接 ${soundUnits[2]}。完整連讀一次後，才和選項逐字比對。`;
  }

  if (/how old/i.test(question.prompt)) {
    return "步驟 1：圈出 How old，確認題目在問年齡。步驟 2：在選項中找「人物＋be 動詞＋歲數」的完整回答。";
  }

  if (/\bcan(?:not|'t)?\b/i.test(question.prompt)) {
    return "步驟 1：分開記錄人物會做與不會做的事。步驟 2：逐項核對主詞、can 或 cannot，以及後面的動作。";
  }

  if (/what time|\bwhen\b/i.test(question.prompt)) {
    return "步驟 1：先確認問句要找時間。步驟 2：把小時和分鐘分開核對，再合成一個完整時間。";
  }

  if (/\bwhere\b/i.test(question.prompt)) {
    return "步驟 1：圈出地點方向字。步驟 2：按照樓層、方向、相鄰位置的順序，逐層刪除不合的選項。";
  }

  return "步驟 1：把題幹拆成「要找什麼」和「有哪些條件」。步驟 2：每次只核對一個條件，全部符合後才保留選項。";
}

const EXAMPLE_CARDS: Readonly<Record<string, readonly string[]>> = {
  "cvc-decoding": [
    "相似例：/s/ + /ɪ/ + /t/ 可以連成 sit。先照這個「首音＋中間音＋尾音」流程練一次，再回到本題。",
    "相似例：/d/ + /ɒ/ + /g/ 可以連成 dog。先接前兩個音，再補尾音，接著把同一流程帶回本題。",
  ],
  "uppercase-lowercase": [
    "相似例：大寫 B 和小寫 b 是同一個字母。先說出字母名稱，再比較大小寫的形狀。",
    "相似例：大寫 D 對應小寫 d。用相同字母名稱當橋梁，再回頭觀察本題。",
  ],
  "weather-listening": [
    "相似例：聽到 It is windy 時，要把 windy 和有風的情境配對。先抓天氣字，再回到本題。",
    "相似例：聽到 It will rain later 時，later 是時間線索。先分開記錄天氣和時間，再處理本題。",
  ],
  "image-sentence-meaning": [
    "相似例：圖中女孩正在跑，She is running 同時符合人物與動作；只符合其中一項還不夠。",
    "相似例：圖中兩隻貓在椅子下，句子必須同時符合數量、動物與位置。照三項檢查本題。",
  ],
  adjectives: [
    "相似例：A feather is light。先從情境找出物品特徵，再配對形容詞；現在用同一方法處理本題。",
    "相似例：Ice feels cold。不要先猜單字，先從觸感線索決定需要哪一類形容詞。",
  ],
  "age-and-can": [
    "相似例：How old is Amy? — She is eight. 先判斷問的是年齡還是能力，再套用對應句型。",
    "相似例：Can Leo swim? — Yes, he can. 先核對人物與能力，再選 Yes 或 No。",
  ],
  "short-dialogue": [
    "相似例：Where is the library? 要回答地點，不回答時間。先判斷問句需要哪一類資訊，再接續對話。",
    "相似例：What time is lunch? 要找時間資訊。先確認問題類型，再從上一句找配對內容。",
  ],
};

const DEFAULT_EXAMPLE_CARDS = [
  "相似例：題目若問時間，回答也要提供時間。先判斷資訊類型，再把同一個配對方法帶回本題。",
  "相似例：若句子同時給人物與動作，選項也必須兩項都符合。先核對一項，再核對另一項。",
] as const;

function buildExampleCardClue(question: Question): string {
  const candidates = EXAMPLE_CARDS[question.microSkill] ?? DEFAULT_EXAMPLE_CARDS;
  const correctText =
    question.options.find((option) => option.id === question.correctOptionId)?.text ?? "";

  return candidates.find((candidate) => !containsAnswer(candidate, correctText)) ??
    "相似例只示範方法：先辨認題目要找的資訊類型，再逐項核對條件；請把這兩步帶回本題。";
}

function containsAnswer(example: string, answer: string): boolean {
  const normalizedAnswer = answer.trim().toLocaleLowerCase().replace(/[.!?。！？]+$/u, "");
  if (!normalizedAnswer) return false;

  const normalizedExample = example.toLocaleLowerCase();
  if (normalizedAnswer.length === 1) {
    const escapedAnswer = normalizedAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z])${escapedAnswer}([^a-z]|$)`, "i").test(normalizedExample);
  }

  return normalizedExample.includes(normalizedAnswer);
}
