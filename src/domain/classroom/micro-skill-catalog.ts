type MicroSkillGuidance = Readonly<{
  label: string;
  focus: string;
}>;

const catalog: Readonly<Record<string, MicroSkillGuidance>> = {
  "uppercase-lowercase": {
    label: "大小寫字母配對",
    focus: "用字母名稱與關鍵外形特徵重新配對大小寫，再混入相似字母做辨識",
  },
  "letter-listening": {
    label: "字母聽辨",
    focus: "採用「聽音、指認、跟讀」三步驟，特別對照容易混淆的字母音",
  },
  "letter-writing": {
    label: "字母書寫",
    focus: "先示範起筆位置與筆順，再讓學生看一筆、說一筆、寫一筆",
  },
  "phonological-awareness": {
    label: "音韻覺識",
    focus: "先只聽首音、尾音或音節，不急著看完整拼字，再把聲音連回字形",
  },
  "cvc-decoding": {
    label: "CVC 拼讀",
    focus: "用「逐音分解、滑音合成、整字讀出」練習短母音 CVC 字",
  },
  "affirmative-negative": {
    label: "肯定句與否定句",
    focus: "先圈出 be 動詞或助動詞，再用 not 的位置比較肯定句與否定句",
  },
  "image-sentence-match": {
    label: "圖句配對",
    focus: "先從圖片找人物、動作與數量，再逐一核對句子中的關鍵詞",
  },
  "this-that-questions": {
    label: "This／That 問句",
    focus: "用遠近位置搭配 this／that，再練習 Is this／that…? 的完整短答",
  },
  "yes-no-questions": {
    label: "Yes／No 問句",
    focus: "先對齊問句開頭、主詞與代名詞，再練習 Yes／No 的完整短答",
  },
  adjectives: {
    label: "形容詞理解",
    focus: "用同一名詞搭配相反形容詞做對照，確認學生抓到描述特徵而非只猜單字",
  },
  "age-and-can": {
    label: "年齡與 Can 句型",
    focus: "分開對照 How old…? 與 Can…? 的提問目的，再套入各自的回答句框",
  },
  "image-sentence-meaning": {
    label: "圖句語意",
    focus: "先口述圖片中的人物、動作與位置，再檢查句子是否三項都吻合",
  },
  "short-dialogue": {
    label: "短對話理解",
    focus: "逐輪標記說話者、問題目的與關鍵回應，避免只靠單一關鍵字猜答案",
  },
  "weather-listening": {
    label: "天氣聽力",
    focus: "先建立天氣詞的聲音與圖像連結，再用相近音選項做聽辨對照",
  },
  "clothing-and-have": {
    label: "衣物與 Have 句型",
    focus: "先辨認衣物與單複數，再對照 I／you／they have 與 he／she has",
  },
  "integrated-dialogue-text": {
    label: "整合對話閱讀",
    focus: "先讀問題，再回到對話標記人物、代名詞與轉折詞，最後整合跨句線索",
  },
  "occupation-and-family": {
    label: "職業與家庭",
    focus: "把家庭關係、人物代名詞與職業詞分成三欄配對，再放回完整句",
  },
  "place-and-destination": {
    label: "地點與目的地",
    focus: "對照 Where…?、地點詞與 go to… 的功能，先問方向再補完整回答",
  },
  "present-progressive": {
    label: "現在進行式",
    focus: "用正在發生的動作圖確認 be 動詞加 V-ing，並對照不同主詞的 be 動詞",
  },
};

export function getMicroSkillLabel(microSkill: string): string {
  return catalog[microSkill]?.label ?? microSkill.replaceAll("-", " ");
}

export function getMicroSkillRemediationFocus(microSkill: string): string {
  return (
    catalog[microSkill]?.focus ??
    "先用一組正例與反例說清楚判斷線索，再讓學生口頭說出選擇理由"
  );
}
