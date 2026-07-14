import type { Grade } from "../questions/question-schema";

export const PRIORITY_MICRO_SKILLS: Readonly<Record<Grade, readonly string[]>> = {
  3: [
    "uppercase-lowercase",
    "letter-listening",
    "letter-writing",
    "phonological-awareness",
    "cvc-decoding",
  ],
  4: [
    "image-sentence-match",
    "affirmative-negative",
    "this-that-questions",
    "yes-no-questions",
    "cvc-decoding",
  ],
  5: [
    "weather-listening",
    "image-sentence-meaning",
    "adjectives",
    "age-and-can",
    "short-dialogue",
  ],
  6: [
    "place-and-destination",
    "present-progressive",
    "clothing-and-have",
    "occupation-and-family",
    "integrated-dialogue-text",
  ],
};
