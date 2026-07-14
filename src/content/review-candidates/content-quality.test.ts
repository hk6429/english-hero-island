import { describe, expect, it } from "vitest";
import type { Question } from "@/domain/questions/question-schema";
import { reviewCandidateQuestionBank } from "./index";

function questionById(id: string): Question {
  const question = reviewCandidateQuestionBank.find((candidate) => candidate.id === id);
  expect(question, id).toBeDefined();
  if (!question) {
    throw new Error(`Missing question: ${id}`);
  }
  return question;
}

function correctAnswer(question: Question): string {
  const answer = question.options.find((option) => option.id === question.correctOptionId)?.text;
  expect(answer, question.id).toBeDefined();
  return answer ?? "";
}

describe("question-bank content quality regressions", () => {
  it("keeps the grade 3 sun listening choices acoustically distinct", () => {
    const question = questionById("g3-review-cvc-decoding-04");

    expect(question.audio?.transcript).toBe("sun");
    expect(question.options.map((option) => option.text.toLocaleLowerCase())).not.toContain("son");
  });

  it("gives the grade 3 CVC sentence one explicit phonics answer", () => {
    const question = questionById("g3-review-cvc-decoding-07");
    const options = question.options.map((option) => option.text.toLocaleLowerCase());

    expect(question.prompt.toLocaleLowerCase()).toContain("short-a");
    expect(options).not.toContain("cap, map");
    expect(options).toEqual(expect.arrayContaining(["cat, mat", "hen, bed", "dog, log"]));
  });

  it("completes the grade 6 basketball sentence with natural word order", () => {
    const question = questionById("g6-review-progressive-02");
    const answer = correctAnswer(question);

    expect(answer).toBe("are playing");
    expect(question.prompt.replace("___", answer)).toBe(
      "Look! The boys are playing basketball on the playground.",
    );
  });

  it("keeps grade 5 image alternatives structural and non-revealing", () => {
    const safeAlternatives: Readonly<Record<string, string>> = {
      "g5-review-image-01": "池塘邊的人物與動物情境圖，請觀察圖片後選句子",
      "g5-review-image-02": "雨天室內的人物與門窗情境圖，請觀察圖片後作答",
      "g5-review-image-03": "家庭成員與餐桌物品的情境圖，請觀察圖片後選出敘述",
      "g5-review-image-04": "桌子與動物的室內情境圖，請核對數量與位置後作答",
      "g5-review-image-05": "公共室內空間中的人物與物品情境圖，請根據圖片推測人物目的",
      "g5-review-image-06": "交通場站中的人物與時鐘情境圖，請核對人物、時間與行動",
      "g5-review-image-07": "公園入口的標誌與人物情境圖，請依兩者關係選出敘述",
    };

    for (const [id, expectedAlt] of Object.entries(safeAlternatives)) {
      expect(questionById(id).image?.alt, id).toBe(expectedAlt);
    }
  });

  it("does not print the pilot red-hat answer in its own prompt", () => {
    const question = questionById("g3-cvc-practice-05");

    expect(correctAnswer(question)).toBe("hat");
    expect(question.prompt).toBe("Look at the picture. Complete the phrase: a red ___.");
  });

  it("keeps the revised grade 6 grammar sentences supported and natural", () => {
    const watering = questionById("g6-review-progressive-01");
    expect(watering.prompt).toBe(
      "Water is flowing from Mia's watering can onto the yellow flowers right now. What is she doing?",
    );
    expect(correctAnswer(watering)).toBe("She is watering the yellow flowers.");

    const cap = questionById("g6-review-clothing-01");
    const capAnswer = correctAnswer(cap);
    expect(capAnswer).toBe("have a red cap");
    expect(cap.prompt.replace("___", capAnswer)).toBe(
      "I have a red cap in my sports bag for today's baseball game.",
    );

    const skirts = questionById("g6-review-clothing-02");
    const skirtsAnswer = correctAnswer(skirts);
    expect(skirtsAnswer).toBe("has two skirts: a green one and a purple one");
    expect(skirts.prompt.replace("___", skirtsAnswer)).toBe(
      "Tina has two skirts: a green one and a purple one for school events.",
    );
  });

  it("limits grade 6 real-world inferences to facts supported by the prompt", () => {
    expect(correctAnswer(questionById("g6-review-place-05"))).toBe(
      "They are going to the natural history museum.",
    );
    expect(correctAnswer(questionById("g6-review-occupation-06"))).toBe(
      "Liam's mother is a pilot, and his father works with patients.",
    );
    expect(correctAnswer(questionById("g6-review-integrated-06"))).toBe(
      "She will go to the drugstore for the medicine.",
    );
  });

  it("uses explicit phonics and context clues for the revised pilot items", () => {
    expect(questionById("g4-review-cvc-02").prompt).toContain("/p/ /ɛ/ /n/");
    expect(questionById("g6-diagnostic-occupation-family-01").prompt).toBe(
      "My mother works in a hospital. She checks sick people and decides what medicine can help them. She is a ___.",
    );
    expect(questionById("g4-yes-no-boss-01").prompt).toBe(
      "A red ruler is on the desk. A: Is that your ruler? B: ____. My ruler is blue, not red.",
    );
  });
});
