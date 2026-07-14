import { describe, expect, it } from "vitest";
import {
  deriveActivityLearningReport,
  type ActivityLearningEvidence,
} from "./derive-activity-learning-report";

function evidence(
  overrides: Partial<ActivityLearningEvidence> = {},
): ActivityLearningEvidence {
  return {
    activityId: "33333333-3333-4333-8333-333333333333",
    title: "Yes／No 快速救援",
    status: "ended",
    audience: "whole_class",
    microSkill: "yes-no-questions",
    questionCount: 3,
    participantCount: 8,
    respondingParticipantCount: 8,
    completedParticipantCount: 7,
    questions: [
      {
        position: 1,
        questionId: "q1",
        responseCount: 8,
        independentCorrectCount: 7,
        assistedCorrectCount: 0,
        rescuedCount: 0,
        pendingSupportCount: 1,
      },
      {
        position: 2,
        questionId: "q2",
        responseCount: 8,
        independentCorrectCount: 4,
        assistedCorrectCount: 0,
        rescuedCount: 0,
        pendingSupportCount: 4,
      },
      {
        position: 3,
        questionId: "q3",
        responseCount: 7,
        independentCorrectCount: 6,
        assistedCorrectCount: 0,
        rescuedCount: 0,
        pendingSupportCount: 1,
      },
    ],
    ...overrides,
  };
}

describe("deriveActivityLearningReport", () => {
  it("separates assisted completion from independent evidence", () => {
    const report = deriveActivityLearningReport({
      ...evidence(),
      completedParticipantCount: 8,
      questions: [1, 2, 3].map((position) => ({
        position,
        questionId: `q${position}`,
        responseCount: 8,
        independentCorrectCount: 4,
        assistedCorrectCount: 3,
        rescuedCount: 0,
        pendingSupportCount: 1,
      })),
    } as unknown as ActivityLearningEvidence);

    expect(report.metrics).toMatchObject({
      independentCorrectPercent: 50,
      assistedCorrectPercent: 38,
      pendingSupportPercent: 13,
    });
    expect(report.verdict).toBe("common_weakness");
  });

  it("treats widespread assisted completion as a common support signal", () => {
    const report = deriveActivityLearningReport(
      evidence({
        completedParticipantCount: 8,
        questions: [
          {
            position: 1,
            questionId: "q1",
            responseCount: 8,
            independentCorrectCount: 7,
            assistedCorrectCount: 0,
            rescuedCount: 0,
            pendingSupportCount: 1,
          },
          {
            position: 2,
            questionId: "q2",
            responseCount: 8,
            independentCorrectCount: 4,
            assistedCorrectCount: 4,
            rescuedCount: 0,
            pendingSupportCount: 0,
          },
          {
            position: 3,
            questionId: "q3",
            responseCount: 8,
            independentCorrectCount: 7,
            assistedCorrectCount: 0,
            rescuedCount: 0,
            pendingSupportCount: 1,
          },
        ],
      }),
    );

    expect(report.verdict).toBe("common_weakness");
    expect(report.commonWeaknesses).toContainEqual({
      position: 2,
      responseCount: 8,
      assistedCorrectCount: 4,
      rescuedCount: 0,
      pendingSupportCount: 0,
      supportUseCount: 4,
      supportUsePercent: 50,
    });
  });

  it("keeps rescued completions out of independent evidence and in support use", () => {
    const report = deriveActivityLearningReport({
      ...evidence(),
      completedParticipantCount: 8,
      questions: [1, 2, 3].map((position) => ({
        position,
        questionId: `q${position}`,
        responseCount: 8,
        independentCorrectCount: 4,
        assistedCorrectCount: 0,
        rescuedCount: 3,
        pendingSupportCount: 1,
      })),
    } as unknown as ActivityLearningEvidence);

    expect(report.metrics).toMatchObject({
      independentCorrectPercent: 50,
      rescuedPercent: 38,
    });
    expect(report.commonWeaknesses[0]).toMatchObject({
      rescuedCount: 3,
      supportUseCount: 4,
      supportUsePercent: 50,
    });
  });

  it("refuses to infer a common weakness from fewer than five participants", () => {
    const report = deriveActivityLearningReport(
      evidence({
        audience: "small_group",
        participantCount: 4,
        respondingParticipantCount: 4,
        completedParticipantCount: 4,
        questions: [
          {
            position: 1,
            questionId: "q1",
            responseCount: 4,
            independentCorrectCount: 1,
            assistedCorrectCount: 0,
            rescuedCount: 0,
            pendingSupportCount: 3,
          },
          {
            position: 2,
            questionId: "q2",
            responseCount: 4,
            independentCorrectCount: 1,
            assistedCorrectCount: 0,
            rescuedCount: 0,
            pendingSupportCount: 3,
          },
          {
            position: 3,
            questionId: "q3",
            responseCount: 4,
            independentCorrectCount: 2,
            assistedCorrectCount: 0,
            rescuedCount: 0,
            pendingSupportCount: 2,
          },
        ],
      }),
    );

    expect(report.verdict).toBe("data_insufficient");
    expect(report.commonWeaknesses).toEqual([]);
    expect(report.evidenceReasons.join(" ")).toContain("至少 5 位");
    expect(report.recommendation.title).toBe("先補足證據，再決定補救");
  });

  it("identifies only sufficiently observed questions as common weak points", () => {
    const report = deriveActivityLearningReport(evidence());

    expect(report.verdict).toBe("common_weakness");
    expect(report.metrics).toEqual({
      expectedResponses: 24,
      observedResponses: 23,
      responseCoveragePercent: 96,
      independentCorrectPercent: 74,
      assistedCorrectPercent: 0,
      rescuedPercent: 0,
      pendingSupportPercent: 26,
    });
    expect(report.commonWeaknesses).toEqual([
      {
        position: 2,
        responseCount: 8,
        assistedCorrectCount: 0,
        rescuedCount: 0,
        pendingSupportCount: 4,
        supportUseCount: 4,
        supportUsePercent: 50,
      },
    ]);
    expect(report.recommendation.title).toContain("Yes／No 問句");
    expect(report.recommendation.steps).toHaveLength(3);
    expect(report.recommendation.followUp).toContain("隔日");
  });

  it("marks strong independent evidence as secure without inventing a weakness", () => {
    const report = deriveActivityLearningReport(
      evidence({
        completedParticipantCount: 8,
        questions: [1, 2, 3].map((position) => ({
          position,
          questionId: `q${position}`,
          responseCount: 8,
          independentCorrectCount: 7,
          assistedCorrectCount: 0,
          rescuedCount: 0,
          pendingSupportCount: 1,
        })),
      }),
    );

    expect(report.verdict).toBe("secure");
    expect(report.commonWeaknesses).toEqual([]);
    expect(report.recommendation.title).toBe("維持精熟，轉移到新情境");
  });

  it("keeps an active activity provisional even when response counts look complete", () => {
    const report = deriveActivityLearningReport(evidence({ status: "active" }));

    expect(report.verdict).toBe("data_insufficient");
    expect(report.evidenceReasons.join(" ")).toContain("活動尚未結束");
  });
});
