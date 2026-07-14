export type SupportedGrade = 3 | 4 | 5 | 6;

export type CreateClassroomDraftResult =
  | Readonly<{
      ok: true;
      classroom: Readonly<{ title: string; grade: SupportedGrade }>;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "classroom_title_required"
        | "classroom_title_too_long"
        | "unsupported_grade";
    }>;

export function createClassroomDraft(input: {
  title: string;
  grade: number;
}): CreateClassroomDraftResult {
  const title = input.title.trim();
  if (!title) return { ok: false, reason: "classroom_title_required" };
  if (title.length > 80) return { ok: false, reason: "classroom_title_too_long" };
  if (![3, 4, 5, 6].includes(input.grade)) {
    return { ok: false, reason: "unsupported_grade" };
  }

  return {
    ok: true,
    classroom: { title, grade: input.grade as SupportedGrade },
  };
}
