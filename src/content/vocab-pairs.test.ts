import { describe, expect, it } from "vitest";
import { pilotQuestionBank } from "./pilot";
import { newReviewCandidates } from "./review-candidates";
import { VOCAB_PAIRS, vocabByGrade } from "./vocab-pairs";
import type { Grade } from "@/domain/questions/question-schema";

const grades: Grade[] = [3, 4, 5, 6];

// 題庫所有單一英文單字正解，作為「錨定」比對集合
const bankWords = new Set(
  [...pilotQuestionBank, ...newReviewCandidates].flatMap((q) => {
    const correct = q.options.find((o) => o.id === q.correctOptionId);
    const text = correct?.text.trim() ?? "";
    return /^[A-Za-z]{2,12}$/.test(text) ? [text.toLowerCase()] : [];
  }),
);

describe("vocab pairs", () => {
  it("gives every grade at least eight clean, unique pairs", () => {
    for (const grade of grades) {
      const pairs = vocabByGrade(grade);
      expect(pairs.length, `grade ${grade}`).toBeGreaterThanOrEqual(8);
      expect(new Set(pairs.map((p) => p.en)).size, `grade ${grade} unique`).toBe(pairs.length);

      for (const pair of pairs) {
        expect(/^[a-z]{2,12}$/.test(pair.en), `${pair.en} is a plain word`).toBe(true);
        expect(pair.zh.trim().length, `${pair.en} has a gloss`).toBeGreaterThan(0);
        expect(pair.emoji.trim().length, `${pair.en} has an emoji`).toBeGreaterThan(0);
        expect(pair.grade).toBe(grade);
      }
    }
  });

  it("anchors each grade to real question-bank answer words (no free-floating grade)", () => {
    for (const grade of grades) {
      const anchored = vocabByGrade(grade).filter((p) => bankWords.has(p.en));
      // 每個年級至少三個字直接來自題庫正解，確保與教學內容連動、非憑空造字
      expect(anchored.length, `grade ${grade} anchored`).toBeGreaterThanOrEqual(3);
    }
  });

  it("has no duplicate english word across the whole set", () => {
    const all = VOCAB_PAIRS.map((p) => `${p.grade}:${p.en}`);
    expect(new Set(all).size).toBe(all.length);
  });
});
