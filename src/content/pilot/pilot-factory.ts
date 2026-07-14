import type { Grade, Question, QuestionPurpose, Skill } from "@/domain/questions/question-schema";

export type PilotQuestionSeed = Readonly<{
  id: string;
  grade: Grade;
  skill: Skill;
  indicator: string;
  microSkill: string;
  difficulty: 1 | 2 | 3;
  purpose: QuestionPurpose;
  prompt: string;
  options: readonly string[];
  answerIndex: number;
  explanation: string;
  hints: readonly string[];
  variantGroup: string;
  modality?: "text" | "audio" | "image";
  audioTranscript?: string;
  imageScene?: string;
  imageAlt?: string;
}>;

const OPTION_IDS = ["a", "b", "c", "d", "e", "f"] as const;

export function pilotQuestion(seed: PilotQuestionSeed): Question {
  const modality = seed.modality ?? "text";
  const indexedOptions = seed.options.map((text, originalIndex) => ({ text, originalIndex }));
  const rotation =
    indexedOptions.length === 0
      ? 0
      : Array.from(seed.id).reduce((total, character) => total + character.charCodeAt(0), 0) %
        indexedOptions.length;
  const rotatedOptions = [
    ...indexedOptions.slice(rotation),
    ...indexedOptions.slice(0, rotation),
  ];
  const correctIndex = rotatedOptions.findIndex(
    (option) => option.originalIndex === seed.answerIndex,
  );
  const correctOptionId = OPTION_IDS[correctIndex];

  if (!correctOptionId) {
    throw new Error(`Invalid answer index for ${seed.id}`);
  }

  if (modality === "audio" && !seed.audioTranscript) {
    throw new Error(`Audio transcript is required for ${seed.id}`);
  }

  if (modality === "image" && (!seed.imageScene || !seed.imageAlt)) {
    throw new Error(`Image scene and alt text are required for ${seed.id}`);
  }

  return {
    id: seed.id,
    version: 1,
    status: "draft",
    grade: seed.grade,
    skill: seed.skill,
    indicator: seed.indicator,
    microSkill: seed.microSkill,
    difficulty: seed.difficulty,
    modality,
    questionType:
      modality === "audio"
        ? "listening_choice"
        : modality === "image"
          ? "image_choice"
          : "multiple_choice",
    purpose: seed.purpose,
    prompt: seed.prompt,
    audio:
      modality === "audio"
        ? {
            src: `tts:${encodeURIComponent(seed.audioTranscript ?? "")}`,
            transcript: seed.audioTranscript ?? "",
          }
        : undefined,
    image:
      modality === "image"
        ? {
            src: `scene:${seed.imageScene}`,
            alt: seed.imageAlt ?? "英語題目情境圖",
          }
        : undefined,
    options: rotatedOptions.map(({ text }, index) => ({ id: OPTION_IDS[index], text })),
    correctOptionId,
    explanation: seed.explanation,
    hints: [...seed.hints],
    variantGroup: seed.variantGroup,
    source: {
      kind: "original",
      note: "依國小英語學習扶助公開能力重點原創，未重製考古題表面內容",
      usageRights: "original-for-project",
    },
    author: {
      id: "hero-island-ai-draft-team",
      displayName: "英語英雄島內容團隊（AI 協作草稿）",
    },
    reviewers: [],
  };
}
