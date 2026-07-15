import { describe, expect, it } from "vitest";
import { makeQuestion } from "@/test/fixtures/question";
import { createMissionSession, selectMissionMicroSkill } from "./session-factory";

function fullMission(grade: 3 | 4 | 5 | 6, microSkill: string) {
  const practice = Array.from({ length: 3 }, (_, index) =>
    makeQuestion({
      id: `${microSkill}-practice-${index + 1}`,
      grade,
      microSkill,
      purpose: "practice",
      variantGroup: `${microSkill}-surface-${index + 1}`,
    }),
  );
  const boss = makeQuestion({
    id: `${microSkill}-boss-01`,
    grade,
    microSkill,
    purpose: "boss",
    variantGroup: `${microSkill}-boss-surface`,
  });
  return [...practice, boss];
}

describe("createMissionSession grade fallback", () => {
  it("builds the mission directly when the grade's target microSkill has full content", () => {
    const bank = fullMission(6, "present-progressive");
    const session = createMissionSession(6, "present-progressive", bank, "s1");

    expect(session).not.toBeNull();
    expect(session?.microSkill).toBe("present-progressive");
    expect(session?.reviewFallbackGrade ?? null).toBeNull();
  });

  it("falls back to a lower grade's well-provisioned focus skill and labels it as a review fallback", () => {
    // grade 6 目標能力題目不足（沒有 boss 題），改借用 grade 5 已驗證足額的重點能力。
    const grade6Gap = [
      makeQuestion({
        id: "g6-thin-practice-1",
        grade: 6,
        microSkill: "thin-skill",
        purpose: "practice",
        variantGroup: "g6-thin-surface-1",
      }),
    ];
    const grade5Full = fullMission(5, "age-and-can");
    const bank = [...grade6Gap, ...grade5Full];

    const session = createMissionSession(6, "thin-skill", bank, "s2");

    expect(session).not.toBeNull();
    expect(session?.microSkill).toBe("age-and-can");
    expect(session?.reviewFallbackGrade).toBe(5);
    expect(session?.questionIds).toHaveLength(4);
  });

  it("returns null when neither the target grade nor any lower grade has enough content", () => {
    const session = createMissionSession(4, "totally-missing-skill", [], "s3");
    expect(session).toBeNull();
  });

  it("repeats the same microSkill instead of dropping a grade when only the exclusion list is exhausted", () => {
    const bank = fullMission(6, "present-progressive");
    const seenIds = bank.map((question) => question.id);

    const session = createMissionSession(6, "present-progressive", bank, "s4", seenIds);

    expect(session).not.toBeNull();
    expect(session?.microSkill).toBe("present-progressive");
    expect(session?.reviewFallbackGrade ?? null).toBeNull();
  });

  it("actually excludes previously seen questions when enough fresh content remains", () => {
    const seen = fullMission(6, "present-progressive");
    const fresh = Array.from({ length: 3 }, (_, index) =>
      makeQuestion({
        id: `present-progressive-fresh-practice-${index + 1}`,
        grade: 6,
        microSkill: "present-progressive",
        purpose: "practice",
        variantGroup: `present-progressive-fresh-surface-${index + 1}`,
      }),
    );
    const freshBoss = makeQuestion({
      id: "present-progressive-fresh-boss-01",
      grade: 6,
      microSkill: "present-progressive",
      purpose: "boss",
      variantGroup: "present-progressive-fresh-boss-surface",
    });
    const bank = [...seen, ...fresh, freshBoss];
    const seenIds = seen.map((question) => question.id);

    const session = createMissionSession(6, "present-progressive", bank, "s5", seenIds);

    expect(session?.questionIds.every((id) => !seenIds.includes(id))).toBe(true);
  });
});

describe("selectMissionMicroSkill", () => {
  it("rotates among microSkills that currently have enough practice and boss content", () => {
    const bank = [...fullMission(6, "present-progressive"), ...fullMission(6, "clothing-and-have")];

    expect(selectMissionMicroSkill(6, bank, 0)).toBe("present-progressive");
    expect(selectMissionMicroSkill(6, bank, 1)).toBe("clothing-and-have");
    expect(selectMissionMicroSkill(6, bank, 2)).toBe("present-progressive");
  });

  it("falls back to the grade's original focus skill when nothing in the rotation is content-ready", () => {
    expect(selectMissionMicroSkill(6, [], 3)).toBe("present-progressive");
  });
});
