import { describe, expect, it } from "vitest";
import { canPublishQuestion } from "./publishing-gate";

describe("question publishing gate", () => {
  it("rejects a question that does not have two distinct English-teacher reviews", () => {
    const result = canPublishQuestion({
      status: "reviewed",
      sourceKind: "original",
      usageRights: "original-for-project",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      allowed: false,
      reasons: ["至少需要兩位不同的英語教師完成複核"],
    });
  });

  it("rejects research-only material even after review", () => {
    const result = canPublishQuestion({
      status: "reviewed",
      sourceKind: "research_reference",
      usageRights: "research-only",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
        {
          id: "teacher-b",
          role: "english_teacher",
          reviewedAt: "2026-07-14T09:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      allowed: false,
      reasons: ["研究參考資料不可直接發布"],
    });
  });

  it("rejects draft content even when review records were attached prematurely", () => {
    const result = canPublishQuestion({
      status: "draft",
      sourceKind: "original",
      usageRights: "original-for-project",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
        {
          id: "teacher-b",
          role: "english_teacher",
          reviewedAt: "2026-07-14T09:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      allowed: false,
      reasons: ["題目必須先完成複核"],
    });
  });

  it("rejects licensed content without public reproduction rights", () => {
    const result = canPublishQuestion({
      status: "reviewed",
      sourceKind: "licensed",
      usageRights: "classroom-display-only",
      reviewers: [
        {
          id: "teacher-a",
          role: "english_teacher",
          reviewedAt: "2026-07-14T08:00:00.000Z",
        },
        {
          id: "teacher-b",
          role: "english_teacher",
          reviewedAt: "2026-07-14T09:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual({
      allowed: false,
      reasons: ["授權範圍不允許公開發布"],
    });
  });
});
