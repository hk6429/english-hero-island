import { describe, expect, it } from "vitest";
import { makeQuestion } from "@/test/fixtures/question";
import { buildDiagnostic } from "./build-diagnostic";

describe("buildDiagnostic", () => {
  it("builds a five-skill grade-three diagnostic in explicit pilot mode", () => {
    const microSkills = [
      "uppercase-lowercase",
      "letter-listening",
      "letter-writing",
      "phonological-awareness",
      "cvc-decoding",
    ] as const;
    const bank = microSkills.map((microSkill, index) =>
      makeQuestion({
        id: `g3-diagnostic-${index + 1}`,
        grade: 3,
        microSkill,
        variantGroup: `g3-${microSkill}-diagnostic`,
      }),
    );

    const result = buildDiagnostic({ grade: 3, bank, contentMode: "pilot" });

    expect(result).toMatchObject({ ok: true, pilotContent: true });
    if (result.ok) {
      expect(result.questions.map((question) => question.microSkill)).toEqual(microSkills);
    }
  });

  it("never falls back to draft questions in published mode", () => {
    const bank = [
      "uppercase-lowercase",
      "letter-listening",
      "letter-writing",
      "phonological-awareness",
      "cvc-decoding",
    ].map((microSkill, index) =>
      makeQuestion({
        id: `g3-draft-${index + 1}`,
        grade: 3,
        microSkill,
        variantGroup: `g3-${microSkill}-draft`,
      }),
    );

    expect(buildDiagnostic({ grade: 3, bank, contentMode: "published" })).toEqual({
      ok: false,
      pilotContent: false,
      reason: "content_gap",
      missingMicroSkills: [
        "uppercase-lowercase",
        "letter-listening",
        "letter-writing",
        "phonological-awareness",
        "cvc-decoding",
      ],
    });
  });
});
