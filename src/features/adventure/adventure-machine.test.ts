import { describe, expect, it } from "vitest";
import { createEmptyProgress } from "@/infrastructure/progress/progress-types";
import { reduceAdventure } from "./adventure-machine";

describe("adventure state machine", () => {
  it("moves a new anonymous hero from onboarding to diagnostic", () => {
    const next = reduceAdventure(createEmptyProgress(), {
      type: "create_profile",
      profile: {
        nickname: "小浪",
        grade: 3,
        heroId: "wave-scout",
      },
    });

    expect(next.profile?.nickname).toBe("小浪");
    expect(next.stage).toBe("diagnostic");
  });

  it("starts a recoverable diagnostic session after the profile exists", () => {
    const withProfile = reduceAdventure(createEmptyProgress(), {
      type: "create_profile",
      profile: {
        nickname: "小浪",
        grade: 3,
        heroId: "wave-scout",
      },
    });
    const session = {
      id: "diagnostic-01",
      kind: "diagnostic" as const,
      microSkill: null,
      questionIds: ["q1", "q2", "q3", "q4", "q5"],
      currentIndex: 0,
      phase: "diagnostic" as const,
      hintsUsed: 0,
      selectedTool: null,
      battle: { armor: 5, shields: 3, combo: 0, rescueActive: false },
      outcomes: [],
    };

    const next = reduceAdventure(withProfile, { type: "start_session", session });

    expect(next.activeSession).toEqual(session);
    expect(next.stage).toBe("diagnostic");
  });

  it("records one event and its XP while advancing the active session", () => {
    const base = {
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3 as const, heroId: "wave-scout" as const },
      stage: "diagnostic" as const,
      activeSession: {
        id: "diagnostic-01",
        kind: "diagnostic" as const,
        microSkill: null,
        questionIds: ["q1", "q2"],
        currentIndex: 0,
        phase: "diagnostic" as const,
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 2, shields: 3, combo: 0, rescueActive: false },
        outcomes: [],
      },
    };
    const event = Object.freeze({
      id: "event-001",
      type: "question_completed" as const,
      outcome: "independent_correct" as const,
      studentId: "student-01",
      sessionId: "diagnostic-01",
      questionId: "q1",
      questionVersion: 1,
      microSkill: "cvc-decoding",
      variantGroup: "cat-family",
      firstSelectedOptionId: "a",
      hintsUsed: 0,
      rescueVariantCorrect: false,
      occurredAt: "2026-07-14T10:00:00.000Z",
      studyDate: "2026-07-14",
    });
    const nextSession = {
      ...base.activeSession,
      currentIndex: 1,
      battle: { armor: 1, shields: 3, combo: 1, rescueActive: false },
      outcomes: ["independent_correct" as const],
    };

    const next = reduceAdventure(base, {
      type: "record_question",
      event,
      xp: 10,
      outcome: "independent_correct",
      nextSession,
    });

    expect(next.events).toEqual([event]);
    expect(next.xp).toBe(10);
    expect(next.activeSession).toEqual(nextSession);
  });

  it("lets the student choose a hint tool before beginning a mission battle", () => {
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 5 as const, heroId: "forest-keeper" as const },
      stage: "mission" as const,
      activeSession: {
        id: "mission-01",
        kind: "mission" as const,
        microSkill: "age-and-can",
        questionIds: ["q1", "q2", "q3", "boss"],
        currentIndex: 0,
        phase: "practice" as const,
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 4, shields: 3, combo: 0, rescueActive: false },
        outcomes: [],
      },
    };

    const prepared = reduceAdventure(progress, {
      type: "choose_tool",
      tool: "sound-lens",
    });
    const battling = reduceAdventure(prepared, { type: "begin_battle" });

    expect(prepared.activeSession?.selectedTool).toBe("sound-lens");
    expect(battling.stage).toBe("battle");
  });

  it("returns to the island after finishing the diagnostic", () => {
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3 as const, heroId: "wave-scout" as const },
      stage: "diagnostic" as const,
      activeSession: {
        id: "diagnostic-01",
        kind: "diagnostic" as const,
        microSkill: null,
        questionIds: ["q1"],
        currentIndex: 1,
        phase: "diagnostic" as const,
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 0, shields: 3, combo: 1, rescueActive: false },
        outcomes: ["independent_correct" as const],
      },
    };

    const next = reduceAdventure(progress, { type: "complete_session" });

    expect(next.stage).toBe("island");
    expect(next.activeSession).toBeNull();
  });

  it("records a completed mission repair before returning to the island", () => {
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 5 as const, heroId: "forest-keeper" as const },
      stage: "battle" as const,
      activeSession: {
        id: "mission-01",
        kind: "mission" as const,
        microSkill: "age-and-can",
        questionIds: ["q1", "boss"],
        currentIndex: 2,
        phase: "boss" as const,
        hintsUsed: 0,
        selectedTool: "example-card" as const,
        battle: { armor: 0, shields: 2, combo: 1, rescueActive: false },
        outcomes: ["assisted_correct" as const, "independent_correct" as const],
      },
    };

    const result = reduceAdventure(progress, { type: "complete_session" });
    const island = reduceAdventure(result, { type: "return_to_island" });

    expect(result.stage).toBe("result");
    expect(result.repairedZones).toContain("age-and-can");
    expect(result.dexEntries).toContain("age-and-can");
    expect(result.abilityCards).toContain("ability-age-and-can");
    expect(island.stage).toBe("island");
    expect(island.activeSession).toBeNull();
  });
});
