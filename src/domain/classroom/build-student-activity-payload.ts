import type { Question } from "@/domain/questions/question-schema";

export type StudentActivityQuestion = Readonly<{
  id: string;
  version: number;
  grade: Question["grade"];
  microSkill: string;
  modality: Question["modality"];
  questionType: Question["questionType"];
  purpose: Question["purpose"];
  prompt: string;
  options: ReadonlyArray<Readonly<{ id: string; text: string }>>;
  audio?: Readonly<{ src: string }>;
  image?: Readonly<{ src: string; alt: string }>;
}>;

export function buildStudentActivityPayload(question: Question): StudentActivityQuestion {
  return Object.freeze({
    id: question.id,
    version: question.version,
    grade: question.grade,
    microSkill: question.microSkill,
    modality: question.modality,
    questionType: question.questionType,
    purpose: question.purpose,
    prompt: question.prompt,
    options: question.options.map((option) => Object.freeze({ id: option.id, text: option.text })),
    ...(question.audio ? { audio: Object.freeze({ src: question.audio.src }) } : {}),
    ...(question.image
      ? { image: Object.freeze({ src: question.image.src, alt: question.image.alt }) }
      : {}),
  });
}
