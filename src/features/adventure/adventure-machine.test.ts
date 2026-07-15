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

  it("patches an existing profile without touching progress or stage", () => {
    const withProfile = reduceAdventure(createEmptyProgress(), {
      type: "create_profile",
      profile: { nickname: "小浪", grade: 3, heroId: "wave-scout" },
    });
    const withProgress = {
      ...withProfile,
      xp: 120,
      stage: "island" as const,
      abilityCards: ["ability-cvc-decoding"],
    };

    const next = reduceAdventure(withProgress, {
      type: "update_profile",
      profile: { nickname: "小海星", grade: 3, heroId: "forest-keeper", accent: "coral" },
    });

    expect(next.profile).toEqual({
      nickname: "小海星",
      grade: 3,
      heroId: "forest-keeper",
      accent: "coral",
    });
    expect(next.xp).toBe(120);
    expect(next.stage).toBe("island");
    expect(next.abilityCards).toEqual(["ability-cvc-decoding"]);
  });

  it("ignores update_profile before any profile exists", () => {
    const next = reduceAdventure(createEmptyProgress(), {
      type: "update_profile",
      profile: { nickname: "小海星", grade: 3, heroId: "forest-keeper" },
    });

    expect(next.profile).toBeNull();
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
  toolUsed: null,
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

  it("requires both a hint tool and an equal-cost route before beginning a mission battle", () => {
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
        selectedRoute: null,
        battle: { armor: 4, shields: 3, combo: 0, rescueActive: false },
        outcomes: [],
      },
    };

    const prepared = reduceAdventure(progress, {
      type: "choose_tool",
      tool: "sound-lens",
    });
    const blocked = reduceAdventure(prepared, { type: "begin_battle" });
    const routed = reduceAdventure(prepared, {
      type: "choose_route",
      route: "story-trail",
    });
    const battling = reduceAdventure(routed, { type: "begin_battle" });

    expect(prepared.activeSession?.selectedTool).toBe("sound-lens");
    expect(blocked.stage).toBe("mission");
    expect(routed.activeSession?.selectedRoute).toBe("story-trail");
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
    const completedEvent = Object.freeze({
      id: "event-mission-complete",
      type: "question_completed" as const,
      outcome: "independent_correct" as const,
      studentId: "student-05",
      sessionId: "mission-01",
      questionId: "boss",
      questionVersion: 1,
      microSkill: "age-and-can",
      variantGroup: "age-can-boss",
      firstSelectedOptionId: "a",
      hintsUsed: 0,
      rescueVariantCorrect: false,
  toolUsed: null,
      occurredAt: "2026-07-14T10:00:00.000Z",
      studyDate: "2026-07-14",
    });
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小森", grade: 5 as const, heroId: "forest-keeper" as const },
      stage: "battle" as const,
      events: [completedEvent],
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
    expect(result.streak).toEqual({ completedDates: ["2026-07-14"], brightness: 3 });
    expect(result.completedMissionCount).toBe(1);
    expect(island.stage).toBe("island");
    expect(island.activeSession).toBeNull();
  });

  it("awards at most one persistent starlight key for each mission study date", () => {
    function completedMission(
      progress: ReturnType<typeof createEmptyProgress>,
      sessionId: string,
      studyDate: string,
    ) {
      const event = Object.freeze({
        id: `event-${sessionId}`,
        type: "question_completed" as const,
        outcome: "independent_correct" as const,
        studentId: "student-06",
        sessionId,
        questionId: `boss-${sessionId}`,
        questionVersion: 1,
        microSkill: "present-progressive",
        variantGroup: `progressive-${sessionId}`,
        firstSelectedOptionId: "a",
        hintsUsed: 0,
        rescueVariantCorrect: false,
  toolUsed: null,
        occurredAt: `${studyDate}T10:00:00.000Z`,
        studyDate,
      });

      return {
        ...progress,
        profile: { nickname: "小星", grade: 6 as const, heroId: "star-smith" as const },
        stage: "battle" as const,
        events: [...progress.events, event],
        activeSession: {
          id: sessionId,
          kind: "mission" as const,
          microSkill: "present-progressive",
          questionIds: [event.questionId],
          currentIndex: 1,
          phase: "boss" as const,
          hintsUsed: 0,
          selectedTool: "example-card" as const,
          selectedRoute: "story-trail" as const,
          battle: { armor: 0, shields: 3, combo: 1, rescueActive: false },
          outcomes: ["independent_correct" as const],
        },
      };
    }

    const firstDay = reduceAdventure(
      completedMission(createEmptyProgress(), "mission-one", "2026-07-14"),
      { type: "complete_session" },
    );
    const repeatedDay = reduceAdventure(
      completedMission(firstDay, "mission-two", "2026-07-14"),
      { type: "complete_session" },
    );
    const nextDay = reduceAdventure(
      completedMission(repeatedDay, "mission-three", "2026-07-15"),
      { type: "complete_session" },
    );

    expect(firstDay.starlightKeys).toBe(1);
    expect(repeatedDay.starlightKeys).toBe(1);
    expect(nextDay.starlightKeys).toBe(2);
    expect(nextDay.starlightKeyDates).toEqual(["2026-07-14", "2026-07-15"]);
  });

  it("spends one key on a first reveal while keeping collected stars free to revisit", () => {
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小星", grade: 6 as const, heroId: "star-smith" as const },
      stage: "island" as const,
      starlightKeys: 1,
    };

    const discovered = reduceAdventure(progress, {
      type: "record_discovery",
      discoveryId: "constellation-action-now",
    });
    const repeated = reduceAdventure(discovered, {
      type: "record_discovery",
      discoveryId: "constellation-action-now",
    });
    const blockedWithoutKey = reduceAdventure(repeated, {
      type: "record_discovery",
      discoveryId: "constellation-action-question",
    });

    expect(discovered.discoveries).toEqual(["constellation-action-now"]);
    expect(discovered.starlightKeys).toBe(0);
    expect(repeated.discoveries).toEqual(["constellation-action-now"]);
    expect(repeated.starlightKeys).toBe(0);
    expect(blockedWithoutKey).toBe(repeated);
  });

  it("keeps one anonymous partner encouragement card without duplicating it", () => {
    const progress = {
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3 as const, heroId: "wave-scout" as const },
      stage: "result" as const,
    };
    const card = {
      id: "encouragement-01",
      message: "我看見你有先自己想，再決定要不要用提示。",
      receivedAt: "2026-07-14T10:00:00.000Z",
    };

    const received = reduceAdventure(progress, {
      type: "record_partner_encouragement",
      card,
    });
    const repeated = reduceAdventure(received, {
      type: "record_partner_encouragement",
      card,
    });

    expect(received.partnerEncouragements).toEqual([card]);
    expect(repeated.partnerEncouragements).toEqual([card]);
  });

  it("applies partner rescue support by updating only the active session", () => {
    const base = {
      ...createEmptyProgress(),
      profile: { nickname: "小浪", grade: 3 as const, heroId: "wave-scout" as const },
      stage: "battle" as const,
      activeSession: {
        id: "mission-01",
        kind: "mission" as const,
        microSkill: "cvc-decoding",
        questionIds: ["q1", "q2"],
        currentIndex: 1,
        phase: "practice" as const,
        hintsUsed: 0,
        selectedTool: null,
        battle: { armor: 2, shields: 0, combo: 0, rescueActive: true },
        outcomes: ["pending_support" as const],
      },
    };

    const next = reduceAdventure(base, {
      type: "apply_rescue_support",
      nextSession: {
        ...base.activeSession,
        battle: { ...base.activeSession.battle, shields: 1, rescueActive: false },
      },
    });

    expect(next.activeSession?.battle).toEqual({
      armor: 2,
      shields: 1,
      combo: 0,
      rescueActive: false,
    });
    expect(next.activeSession?.currentIndex).toBe(1);
    expect(next.events).toHaveLength(0);
    expect(next.xp).toBe(0);
    expect(next.stage).toBe("battle");
  });
});
