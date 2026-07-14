import { pilotQuestion, type PilotQuestionSeed } from "./pilot-factory";

const q = (seed: Omit<PilotQuestionSeed, "grade">) => pilotQuestion({ grade: 3, ...seed });

export const grade3Questions = [
  q({
    id: "g3-diagnostic-uppercase-lowercase-01", skill: "letters", indicator: "能辨識英文字母大小寫", microSkill: "uppercase-lowercase", difficulty: 1, purpose: "diagnostic",
    prompt: "Which lowercase letter matches G?", options: ["g", "q", "p"], answerIndex: 0,
    explanation: "大寫 G 對應的小寫字母是 g。", hints: ["先看字母開口的方向。"], variantGroup: "g3-letter-g-pair",
  }),
  q({
    id: "g3-diagnostic-letter-listening-01", skill: "letters", indicator: "能聽辨英文字母名稱", microSkill: "letter-listening", difficulty: 1, purpose: "diagnostic", modality: "audio", audioTranscript: "B",
    prompt: "Listen. Which letter do you hear?", options: ["B", "D", "P"], answerIndex: 0,
    explanation: "音檔念的是字母 B。", hints: ["注意開頭的 /b/ 聲音。"], variantGroup: "g3-listen-letter-b",
  }),
  q({
    id: "g3-diagnostic-letter-writing-01", skill: "letters", indicator: "能辨認字母的正確書寫形式", microSkill: "letter-writing", difficulty: 1, purpose: "diagnostic",
    prompt: "Which capital letter is the correct match for b?", options: ["B", "D", "P"], answerIndex: 0,
    explanation: "小寫 b 對應的大寫形式是 B。", hints: ["比較直線在左邊還是右邊。"], variantGroup: "g3-write-letter-b",
  }),
  q({
    id: "g3-diagnostic-phonological-awareness-01", skill: "phonics", indicator: "能辨識字詞的起始音", microSkill: "phonological-awareness", difficulty: 1, purpose: "diagnostic", modality: "audio", audioTranscript: "moon",
    prompt: "Which word begins with the same sound as moon?", options: ["map", "sun", "cat"], answerIndex: 0,
    explanation: "moon 和 map 都以 /m/ 開頭。", hints: ["只聽第一個聲音，不用看整個字。"], variantGroup: "g3-onset-m",
  }),
  q({
    id: "g3-diagnostic-cvc-01", skill: "phonics", indicator: "能拼讀基礎 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "diagnostic", modality: "audio", audioTranscript: "cat",
    prompt: "Listen. Which word do you hear?", options: ["cat", "cap", "can"], answerIndex: 0,
    explanation: "cat 的三個音是 /k/、/æ/、/t/。", hints: ["特別注意最後一個聲音。"], variantGroup: "g3-cvc-cat",
  }),
  q({
    id: "g3-cvc-practice-01", skill: "phonics", indicator: "能將三個字母音合成 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "practice",
    prompt: "Blend /m/ /æ/ /p/. Which word do you get?", options: ["map", "mop", "man"], answerIndex: 0,
    explanation: "/m/＋/æ/＋/p/ 合起來是 map。", hints: ["先慢慢連起 m-a，再接 p。"], variantGroup: "g3-cvc-map",
  }),
  q({
    id: "g3-cvc-practice-02", skill: "phonics", indicator: "能辨識 CVC 字詞的短母音", microSkill: "cvc-decoding", difficulty: 1, purpose: "practice",
    prompt: "Which word has the short i sound /ɪ/?", options: ["pig", "pen", "sun"], answerIndex: 0,
    explanation: "pig 中的 i 發短母音 /ɪ/。", hints: ["把三個字各念一次，聽中間的聲音。"], variantGroup: "g3-cvc-pig",
  }),
  q({
    id: "g3-cvc-practice-03", skill: "phonics", indicator: "能聽辨基礎 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "practice", modality: "audio", audioTranscript: "bed",
    prompt: "Listen. Which word do you hear?", options: ["bed", "bad", "big"], answerIndex: 0,
    explanation: "音檔念的是 bed，中間是短 e。", hints: ["先分辨中間的母音。"], variantGroup: "g3-cvc-bed",
  }),
  q({
    id: "g3-cvc-practice-04", skill: "phonics", indicator: "能辨識 CVC 字詞的結尾音", microSkill: "cvc-decoding", difficulty: 1, purpose: "practice",
    prompt: "Which word ends with /t/?", options: ["cat", "cap", "can"], answerIndex: 0,
    explanation: "cat 的最後一個字母是 t，結尾音是 /t/。", hints: ["用手遮住前兩個字母，只看最後一個。"], variantGroup: "g3-cvc-final-t",
  }),
  q({
    id: "g3-cvc-practice-05", skill: "phonics", indicator: "能以圖文線索辨識 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "practice", modality: "image", imageScene: "red-object-on-hook", imageAlt: "一張紅色物品的情境圖，請依題幹選出單字",
    prompt: "The picture shows a red hat. Complete: a red ___.", options: ["hat", "hen", "hop"], answerIndex: 0,
    explanation: "hat 是帽子，句子是 a red hat。", hints: ["注意單字中間是 a，最後是 t。"], variantGroup: "g3-cvc-hat",
  }),
  q({
    id: "g3-cvc-boss-01", skill: "phonics", indicator: "能在短句中辨識相同短母音字詞", microSkill: "cvc-decoding", difficulty: 2, purpose: "boss",
    prompt: "The cat is on a mat. Which two words have the short a sound?", options: ["cat and mat", "cat and on", "is and mat"], answerIndex: 0,
    explanation: "cat 和 mat 的中間字母都是 a，都有短 a 音。", hints: ["先圈出只有三個字母的單字。"], variantGroup: "g3-cvc-boss-cat-mat",
  }),
  q({
    id: "g3-cvc-rescue-01", skill: "phonics", indicator: "能以首字母完成 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "rescue",
    prompt: "Add the first letter: _at means cat.", options: ["c", "m", "s"], answerIndex: 0,
    explanation: "c＋at 組成 cat。", hints: ["cat 的第一個聲音是 /k/。"], variantGroup: "g3-cvc-rescue-cat",
  }),
  q({
    id: "g3-cvc-rescue-02", skill: "phonics", indicator: "能合成基礎 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "rescue",
    prompt: "Blend /s/ /ʌ/ /n/.", options: ["sun", "run", "sit"], answerIndex: 0,
    explanation: "/s/＋/ʌ/＋/n/ 合起來是 sun。", hints: ["先連 s-u，再接 n。"], variantGroup: "g3-cvc-rescue-sun",
  }),
  q({
    id: "g3-cvc-review-01", skill: "phonics", indicator: "能跨日聽辨 CVC 字詞", microSkill: "cvc-decoding", difficulty: 1, purpose: "review", modality: "audio", audioTranscript: "map",
    prompt: "Listen and choose the word.", options: ["map", "man", "mop"], answerIndex: 0,
    explanation: "音檔念的是 map，結尾音是 /p/。", hints: ["最後一個聲音可以幫你排除兩個選項。"], variantGroup: "g3-cvc-review-map",
  }),
  q({
    id: "g3-cvc-review-02", skill: "phonics", indicator: "能遷移短母音拼讀規則", microSkill: "cvc-decoding", difficulty: 2, purpose: "review",
    prompt: "Which word has the same middle sound as pig?", options: ["sit", "pen", "sun"], answerIndex: 0,
    explanation: "pig 和 sit 的中間都是短 i 音 /ɪ/。", hints: ["只比較中間的母音。"], variantGroup: "g3-cvc-review-sit",
  }),
];
