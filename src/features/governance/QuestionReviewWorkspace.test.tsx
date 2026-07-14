import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionReviewWorkspace } from "./QuestionReviewWorkspace";

const questionId = "g4-yes-no-practice-01";
const frozenContentSha256 = "a".repeat(64);

function queueRow() {
  return {
    question_id: questionId,
    question_version: 2,
    question_status: "in_review",
    grade: 4,
    skill: "grammar",
    indicator: "能使用 Yes／No 問句",
    micro_skill: "yes-no-questions",
    difficulty: 2,
    modality: "text",
    question_type: "multiple_choice",
    purpose: "practice",
    prompt: "Is this a kite?",
    audio: null,
    image: null,
    options: [
      { id: "yes", text: "Yes, it is." },
      { id: "no", text: "No, it isn't." },
    ],
    correct_option_id: "yes",
    explanation: "看到單數物品，要用 Yes, it is. 回答。",
    hints: ["先看問句開頭是不是 Is。"],
    variant_group: "g4-yes-no-kite",
    source: {
      kind: "original",
      note: "英語英雄島原創題",
      usageRights: "original-for-project",
    },
    author: { id: "editor-a", displayName: "內容編輯 A" },
    created_by: "11111111-1111-4111-8111-111111111111",
    supersedes_version: 1,
    change_summary: "修正問句與解析",
    content_sha256: frozenContentSha256,
    content_hash_schema: "question-review-snapshot-pg-jsonb-text-v1",
    locked_at: "2026-07-14T07:00:00.000Z",
    created_at: "2026-07-14T06:00:00.000Z",
  };
}

function authenticatedClient(
  role: "english_teacher" | "content_editor" | "administrator" =
    "english_teacher",
) {
  let queueLoads = 0;
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "reviewer-b", is_anonymous: false },
          } as unknown as Session,
        },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockImplementation(async (name: string) => {
      if (name === "get_content_governance_profile") {
        return {
          data: [
            {
              user_id: "11111111-1111-4111-8111-111111111111",
              display_name: role === "english_teacher" ? "英語教師林老師" : "內容編輯王老師",
              reviewer_role: role,
              approval_status: "approved",
            },
          ],
          error: null,
        };
      }
      if (name === "list_question_review_queue") {
        queueLoads += 1;
        return { data: queueLoads === 1 ? [queueRow()] : [], error: null };
      }
      if (name === "submit_question_review") {
        return {
          data: [
            {
              review_id: "22222222-2222-4222-8222-222222222222",
              question_id: questionId,
              question_version: 2,
              question_status: "reviewed",
              approval_count: 2,
              change_request_count: 0,
              acknowledged_content_sha256: frozenContentSha256,
              acknowledged_content_hash_schema:
                "question-review-snapshot-pg-jsonb-text-v1",
              reviewed_at: "2026-07-14T08:00:00.000Z",
              review_recorded_at: "2026-07-14T08:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "search_question_bank" || name === "list_question_quality_signals") {
        return { data: [], error: null };
      }
      return { data: null, error: { message: "unexpected RPC" } };
    }),
  } as unknown as SupabaseClient;
}

describe("QuestionReviewWorkspace", () => {
  afterEach(cleanup);

  it("loads only the protected reviewer queue for an authenticated reviewer", async () => {
    const client = authenticatedClient();
    render(<QuestionReviewWorkspace client={client} />);

    expect(
      await screen.findByRole("heading", { name: "Is this a kite?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("待我複核 1 題")).toBeInTheDocument();
    expect(client.rpc).toHaveBeenCalledWith("list_question_review_queue");
    expect(screen.getByText("英語教師林老師・英語教師")).toBeInTheDocument();
  });

  it("lets a governor end the persistent session on a shared school device", async () => {
    const client = authenticatedClient();
    render(<QuestionReviewWorkspace client={client} />);
    await screen.findByRole("heading", { name: "Is this a kite?" });

    fireEvent.click(screen.getByRole("button", { name: "登出題庫治理" }));

    await waitFor(() => expect(client.auth.signOut).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("heading", { name: "用已核准的工作信箱登入" }),
    ).toBeInTheDocument();
  });

  it("records a real review then reloads the server queue", async () => {
    const client = authenticatedClient();
    render(<QuestionReviewWorkspace client={client} />);
    await screen.findByRole("heading", { name: "Is this a kite?" });

    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }
    fireEvent.change(screen.getByLabelText("複核意見"), {
      target: { value: "內容正確" },
    });
    fireEvent.click(screen.getByRole("button", { name: "通過複核" }));
    fireEvent.click(screen.getByRole("button", { name: "確認送出通過複核" }));

    expect(
      await screen.findByRole("heading", { name: "目前沒有待你複核的題目" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(client.rpc).toHaveBeenCalledWith(
        "submit_question_review",
        expect.objectContaining({
          p_question_id: questionId,
          p_question_version: 2,
          p_expected_content_sha256: frozenContentSha256,
          p_expected_content_hash_schema:
            "question-review-snapshot-pg-jsonb-text-v1",
          p_verdict: "approved",
        }),
      ),
    );
    expect(client.rpc).toHaveBeenCalledTimes(5);
  });

  it("does not offer a fake local queue when Supabase is not configured", () => {
    render(<QuestionReviewWorkspace client={null} />);

    expect(
      screen.getByRole("heading", { name: "題庫治理後端尚未連線" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Is this a kite?")).not.toBeInTheDocument();
  });

  it("routes an approved content editor to the management workspace", async () => {
    const client = authenticatedClient("content_editor");
    render(<QuestionReviewWorkspace client={client} />);

    expect(
      await screen.findByRole("heading", { name: "題庫管理工作區" }),
    ).toBeInTheDocument();
    expect(screen.getByText("內容編輯王老師・內容編輯")).toBeInTheDocument();
    expect(client.rpc).toHaveBeenCalledWith("get_content_governance_profile");
    expect(client.rpc).not.toHaveBeenCalledWith("list_question_review_queue");
  });
});
