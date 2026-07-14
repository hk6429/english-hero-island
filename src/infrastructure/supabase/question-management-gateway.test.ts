import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { QuestionDraftInput } from "@/components/governance/QuestionAuthoringPanel";
import {
  createQuestionRevisionWithSupabase,
  createQuestionDraftWithSupabase,
  getContentGovernanceProfileWithSupabase,
  importQuestionDraftsFromJsonWithSupabase,
  listQuestionVersionsWithSupabase,
  listQuestionQualitySignalsWithSupabase,
  searchQuestionBankWithSupabase,
  submitQuestionForReviewWithSupabase,
} from "./question-management-gateway";

const draft: QuestionDraftInput = {
  id: "g4-yes-no-practice-11",
  grade: 4,
  skill: "grammar",
  indicator: "能使用 Yes／No 問句",
  microSkill: "yes-no-questions",
  difficulty: 1,
  modality: "text",
  questionType: "multiple_choice",
  purpose: "practice",
  prompt: "Is this a kite?",
  options: [
    { id: "a", text: "Yes, it is." },
    { id: "b", text: "No, it isn't." },
  ],
  correctOptionId: "a",
  explanation: "單數物品使用 Yes, it is. 回答。",
  hints: ["先找問句開頭的 Is。"],
  variantGroup: "g4-yes-no-object",
  source: {
    kind: "original",
    note: "依能力指標原創",
    usageRights: "original-for-project",
  },
};

const importedQuestion = {
  ...draft,
  version: 1,
  status: "draft",
  author: { id: "untrusted-client-id", displayName: "不應覆蓋伺服器身分" },
  reviewers: [],
} as const;

function questionBankRow(overrides: Record<string, unknown> = {}) {
  return {
    question_id: draft.id,
    question_version: 2,
    question_status: "reviewed",
    grade: 4,
    skill: "grammar",
    indicator: draft.indicator,
    micro_skill: draft.microSkill,
    difficulty: 1,
    modality: "text",
    question_type: "multiple_choice",
    purpose: "practice",
    prompt: draft.prompt,
    audio: null,
    image: null,
    options: draft.options,
    correct_option_id: "a",
    explanation: draft.explanation,
    hints: draft.hints,
    variant_group: draft.variantGroup,
    source: draft.source,
    author: {
      id: "11111111-1111-4111-8111-111111111111",
      displayName: "內容編輯王老師",
    },
    created_by: "11111111-1111-4111-8111-111111111111",
    supersedes_version: 1,
    change_summary: "修正解析內容",
    locked_at: "2026-07-14T08:00:00.000Z",
    reviewed_at: "2026-07-14T09:00:00.000Z",
    published_at: null,
    created_at: "2026-07-14T07:00:00.000Z",
    approval_count: 2,
    change_request_count: 0,
    ...overrides,
  };
}

describe("question management gateway", () => {
  it("loads the server-owned governance role for the current authenticated user", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: "11111111-1111-4111-8111-111111111111",
            display_name: "內容編輯王老師",
            reviewer_role: "content_editor",
            approval_status: "approved",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(getContentGovernanceProfileWithSupabase(client)).resolves.toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      displayName: "內容編輯王老師",
      role: "content_editor",
      approvalStatus: "approved",
    });
    expect(client.rpc).toHaveBeenCalledWith("get_content_governance_profile");
  });

  it("creates a server-owned draft without trusting client governance fields", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: draft.id,
            question_version: 1,
            question_status: "draft",
            created_by: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(createQuestionDraftWithSupabase(client, draft)).resolves.toEqual({
      questionId: draft.id,
      version: 1,
      status: "draft",
    });
    expect(client.rpc).toHaveBeenCalledWith("create_question_draft", {
      p_question_id: draft.id,
      p_content: {
        grade: 4,
        skill: "grammar",
        indicator: "能使用 Yes／No 問句",
        microSkill: "yes-no-questions",
        difficulty: 1,
        modality: "text",
        questionType: "multiple_choice",
        purpose: "practice",
        prompt: "Is this a kite?",
        options: [
          { id: "a", text: "Yes, it is." },
          { id: "b", text: "No, it isn't." },
        ],
        correctOptionId: "a",
        explanation: "單數物品使用 Yes, it is. 回答。",
        hints: ["先找問句開頭的 Is。"],
        variantGroup: "g4-yes-no-object",
        source: {
          kind: "original",
          note: "依能力指標原創",
          usageRights: "original-for-project",
        },
      },
    });
  });

  it("validates a JSON batch and imports only server-neutral question content", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: importedQuestion.id,
            question_version: 1,
            question_status: "draft",
            created_by: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      importQuestionDraftsFromJsonWithSupabase(
        client,
        JSON.stringify([importedQuestion]),
      ),
    ).resolves.toEqual({ importedCount: 1 });
    expect(client.rpc).toHaveBeenCalledWith("import_question_drafts", {
      p_drafts: [
        {
          questionId: importedQuestion.id,
          content: {
            grade: 4,
            skill: "grammar",
            indicator: "能使用 Yes／No 問句",
            microSkill: "yes-no-questions",
            difficulty: 1,
            modality: "text",
            questionType: "multiple_choice",
            purpose: "practice",
            prompt: "Is this a kite?",
            options: [
              { id: "a", text: "Yes, it is." },
              { id: "b", text: "No, it isn't." },
            ],
            correctOptionId: "a",
            explanation: "單數物品使用 Yes, it is. 回答。",
            hints: ["先找問句開頭的 Is。"],
            variantGroup: "g4-yes-no-object",
            source: {
              kind: "original",
              note: "依能力指標原創",
              usageRights: "original-for-project",
            },
          },
        },
      ],
    });
  });

  it("creates the next immutable version from the exact latest source version", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: draft.id,
            question_version: 3,
            question_status: "draft",
            supersedes_version: 2,
            change_summary: "修正圖片替代文字",
            created_by: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-07-14T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      createQuestionRevisionWithSupabase(client, {
        questionId: draft.id,
        fromVersion: 2,
        changeSummary: " 修正圖片替代文字 ",
        draft,
      }),
    ).resolves.toEqual({
      questionId: draft.id,
      version: 3,
      status: "draft",
      supersedesVersion: 2,
      changeSummary: "修正圖片替代文字",
    });
    expect(client.rpc).toHaveBeenCalledWith("create_question_revision", {
      p_question_id: draft.id,
      p_from_version: 2,
      p_change_summary: "修正圖片替代文字",
      p_content: expect.objectContaining({
        prompt: draft.prompt,
        correctOptionId: draft.correctOptionId,
      }),
    });
  });

  it("submits a draft for review and trusts only the frozen server result", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: draft.id,
            question_version: 1,
            question_status: "in_review",
            locked_at: "2026-07-14T08:30:00.000Z",
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      submitQuestionForReviewWithSupabase(
        client,
        draft.id,
        1,
        " 完成內容與授權自檢 ",
      ),
    ).resolves.toEqual({
      questionId: draft.id,
      version: 1,
      status: "in_review",
      lockedAt: "2026-07-14T08:30:00.000Z",
    });
    expect(client.rpc).toHaveBeenCalledWith("submit_question_for_review", {
      p_question_id: draft.id,
      p_question_version: 1,
      p_note: "完成內容與授權自檢",
    });
  });

  it("searches latest question versions with complete preview and review evidence", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: draft.id,
            question_version: 2,
            question_status: "reviewed",
            grade: 4,
            skill: "grammar",
            indicator: draft.indicator,
            micro_skill: draft.microSkill,
            difficulty: 1,
            modality: "text",
            question_type: "multiple_choice",
            purpose: "practice",
            prompt: draft.prompt,
            audio: null,
            image: null,
            options: draft.options,
            correct_option_id: "a",
            explanation: draft.explanation,
            hints: draft.hints,
            variant_group: draft.variantGroup,
            source: draft.source,
            author: {
              id: "11111111-1111-4111-8111-111111111111",
              displayName: "內容編輯王老師",
            },
            created_by: "11111111-1111-4111-8111-111111111111",
            supersedes_version: 1,
            change_summary: "修正解析內容",
            locked_at: "2026-07-14T08:00:00.000Z",
            reviewed_at: "2026-07-14T09:00:00.000Z",
            published_at: null,
            created_at: "2026-07-14T07:00:00.000Z",
            approval_count: 2,
            change_request_count: 0,
            total_count: 1,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      searchQuestionBankWithSupabase(client, {
        query: " kite ",
        grade: 4,
        status: "reviewed",
        limit: 25,
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: draft.id,
          version: 2,
          status: "reviewed",
          options: draft.options,
          source: draft.source,
          approvalCount: 2,
          changeRequestCount: 0,
        }),
      ],
      totalCount: 1,
      nextCursor: null,
    });
    expect(client.rpc).toHaveBeenCalledWith("search_question_bank", {
      p_query: "kite",
      p_grade: 4,
      p_skill: null,
      p_micro_skill: null,
      p_status: "reviewed",
      p_modality: null,
      p_difficulty: null,
      p_cursor_created_at: null,
      p_cursor_question_id: null,
      p_cursor_question_version: null,
      p_limit: 25,
    });
  });

  it("loads every immutable version for comparison from newest to oldest", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          questionBankRow(),
          questionBankRow({
            question_version: 1,
            question_status: "retired",
            supersedes_version: null,
            change_summary: null,
            created_at: "2026-07-13T07:00:00.000Z",
          }),
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    const versions = await listQuestionVersionsWithSupabase(client, draft.id);

    expect(versions).toHaveLength(2);
    expect(versions.map((version) => version.version)).toEqual([2, 1]);
    expect(versions[0]).toEqual(
      expect.objectContaining({
        prompt: draft.prompt,
        approvalCount: 2,
        supersedesVersion: 1,
      }),
    );
    expect(client.rpc).toHaveBeenCalledWith("list_question_versions", {
      p_question_id: draft.id,
    });
  });

  it("loads anonymous outcome aggregates without student-level data", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            question_id: draft.id,
            question_version: 2,
            question_status: "disputed",
            grade: 4,
            micro_skill: draft.microSkill,
            modality: "text",
            prompt: draft.prompt,
            response_count: 30,
            independent_correct_count: 3,
            assisted_correct_count: 2,
            rescued_count: 20,
            pending_support_count: 5,
            is_disputed: true,
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient;

    await expect(
      listQuestionQualitySignalsWithSupabase(client, {
        grade: 4,
        status: "disputed",
      }),
    ).resolves.toEqual([
      {
        questionId: draft.id,
        version: 2,
        status: "disputed",
        grade: 4,
        microSkill: draft.microSkill,
        modality: "text",
        prompt: draft.prompt,
        responseCount: 30,
        independentCorrectCount: 3,
        assistedCorrectCount: 2,
        rescuedCount: 20,
        pendingSupportCount: 5,
        isDisputed: true,
      },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("list_question_quality_signals", {
      p_grade: 4,
      p_micro_skill: null,
      p_status: "disputed",
      p_modality: null,
    });
  });
});
