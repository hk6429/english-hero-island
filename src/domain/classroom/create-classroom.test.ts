import { describe, expect, it } from "vitest";
import { createClassroomDraft } from "./create-classroom";

describe("createClassroomDraft", () => {
  it("normalizes a supported grade classroom", () => {
    expect(createClassroomDraft({ title: "  四年一班  ", grade: 4 })).toEqual({
      ok: true,
      classroom: { title: "四年一班", grade: 4 },
    });
  });

  it.each([
    [{ title: "   ", grade: 4 }, "classroom_title_required"],
    [{ title: "A".repeat(81), grade: 4 }, "classroom_title_too_long"],
    [{ title: "二年一班", grade: 2 }, "unsupported_grade"],
  ] as const)("rejects invalid classroom input", (input, reason) => {
    expect(createClassroomDraft(input)).toEqual({ ok: false, reason });
  });
});
