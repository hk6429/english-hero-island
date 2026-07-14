import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionManagementWorkspace } from "./QuestionManagementWorkspace";

const frozenContentSha256 = "b".repeat(64);

function searchRow(overrides: Record<string, unknown> = {}) {
  return {
    question_id: "g4-yes-no-practice-01",
    question_version: 2,
    question_status: "reviewed",
    grade: 4,
    skill: "grammar",
    indicator: "能使用 Yes／No 問句",
    micro_skill: "yes-no-questions",
    difficulty: 1,
    modality: "text",
    question_type: "multiple_choice",
    purpose: "practice",
    prompt: "Is this a kite?",
    audio: null,
    image: null,
    options: [
      { id: "a", text: "Yes, it is." },
      { id: "b", text: "No, it isn't." },
    ],
    correct_option_id: "a",
    explanation: "單數物品使用 Yes, it is. 回答。",
    hints: ["先找問句開頭的 Is。"],
    variant_group: "g4-yes-no-object",
    source: {
      kind: "original",
      note: "依能力指標原創",
      usageRights: "original-for-project",
    },
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
    ...overrides,
  };
}

function qualityRow() {
  return {
    question_id: "g4-yes-no-practice-01",
    question_version: 2,
    question_status: "reviewed",
    grade: 4,
    micro_skill: "yes-no-questions",
    modality: "text",
    prompt: "Is this a kite?",
    response_count: 10,
    independent_correct_count: 6,
    assisted_correct_count: 2,
    rescued_count: 1,
    pending_support_count: 1,
    is_disputed: false,
  };
}

function managementClient(row = searchRow()) {
  return {
    rpc: vi.fn().mockImplementation(async (name: string) => {
      if (name === "search_question_bank") {
        return { data: [row], error: null };
      }
      if (name === "list_question_quality_signals") {
        return { data: [qualityRow()], error: null };
      }
      if (name === "list_question_versions") {
        return {
          data: [
            row,
            {
              ...row,
              question_version: 1,
              question_status: "retired",
              prompt: "Is it a kite?",
              supersedes_version: null,
              change_summary: null,
              created_at: "2026-07-13T07:00:00.000Z",
              audio: typeof row.audio === "object" && row.audio !== null
                ? {
                    ...(row.audio as Record<string, unknown>),
                    src: "/audio/yes-no-v1.mp3",
                  }
                : null,
              image: typeof row.image === "object" && row.image !== null
                ? {
                    ...(row.image as Record<string, unknown>),
                    src: "/images/yes-no-v1.webp",
                  }
                : null,
              source: {
                ...(row.source as Record<string, unknown>),
                url: "https://example.edu/source-v1",
              },
            },
          ],
          error: null,
        };
      }
      if (name === "submit_question_for_review") {
        return {
          data: [
            {
              question_id: row.question_id,
              question_version: row.question_version,
              question_status: "in_review",
              locked_at: "2026-07-14T10:00:00.000Z",
              content_sha256: frozenContentSha256,
              content_hash_schema: "question-review-snapshot-pg-jsonb-text-v1",
              content_hashed_at: "2026-07-14T10:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      if (name === "publish_question_version") {
        return {
          data: [
            {
              question_id: row.question_id,
              question_version: row.question_version,
              question_status: "published",
              published_at: "2026-07-14T10:30:00.000Z",
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected RPC: ${name}` } };
    }),
  } as unknown as SupabaseClient;
}

describe("QuestionManagementWorkspace", () => {
  afterEach(cleanup);

  it("loads the real question bank and quality aggregates for an approved editor", async () => {
    const client = managementClient();
    render(
      <QuestionManagementWorkspace
        client={client}
        displayName="內容編輯王老師"
        role="content_editor"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "題庫管理工作區" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "建立單題草稿" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "題庫管理" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "題目品質檢查" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 個題目版本尚未達每題至少 20 份作答/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Is this a kite?" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "發布此版本" }),
    ).not.toBeInTheDocument();
    expect(client.rpc).toHaveBeenCalledWith(
      "search_question_bank",
      expect.any(Object),
    );
    expect(client.rpc).toHaveBeenCalledWith(
      "list_question_quality_signals",
      expect.any(Object),
    );
  });

  it("follows the server cursor so questions after the first 100 remain searchable", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      searchRow({
        question_id: `question-${String(index + 1).padStart(3, "0")}`,
        prompt: `題目 ${index + 1}`,
        created_at: "2026-07-14T07:00:00.000Z",
        total_count: 101,
      }),
    );
    const finalRow = searchRow({
      question_id: "question-101",
      prompt: "題目 101",
      created_at: "2026-07-14T07:00:00.000Z",
      total_count: 101,
    });
    const client = {
      rpc: vi.fn().mockImplementation(async (name: string, params?: Record<string, unknown>) => {
        if (name === "search_question_bank") {
          return params?.p_cursor_question_id
            ? { data: [finalRow], error: null }
            : { data: firstPage, error: null };
        }
        if (name === "list_question_quality_signals") {
          return { data: [], error: null };
        }
        return { data: null, error: { message: `unexpected RPC: ${name}` } };
      }),
    } as unknown as SupabaseClient;

    render(
      <QuestionManagementWorkspace
        assetProbe={async () => []}
        client={client}
        displayName="內容編輯王老師"
        role="content_editor"
      />,
    );

    expect(await screen.findByText("題目 101")).toBeInTheDocument();
    expect(client.rpc).toHaveBeenCalledWith(
      "search_question_bank",
      expect.objectContaining({
        p_cursor_created_at: "2026-07-14T07:00:00.000Z",
        p_cursor_question_id: "question-100",
        p_cursor_question_version: 2,
      }),
    );
  });

  it("requires an explicit note before submitting a draft for real server review", async () => {
    const row = searchRow({
      question_version: 1,
      question_status: "draft",
      supersedes_version: null,
      change_summary: null,
      locked_at: null,
      reviewed_at: null,
      approval_count: 0,
    });
    const client = managementClient(row);
    render(
      <QuestionManagementWorkspace
        client={client}
        displayName="內容編輯王老師"
        role="content_editor"
      />,
    );
    await screen.findByRole("heading", { name: "Is this a kite?" });

    fireEvent.click(screen.getByRole("button", { name: "送交複核" }));
    fireEvent.change(screen.getByLabelText("治理說明"), {
      target: { value: " 完成內容與授權自檢 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "確認送交複核" }));

    await waitFor(() =>
      expect(client.rpc).toHaveBeenCalledWith("submit_question_for_review", {
        p_question_id: row.question_id,
        p_question_version: 1,
        p_note: "完成內容與授權自檢",
      }),
    );
    expect(
      await screen.findByText(new RegExp(frozenContentSha256)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/question-review-snapshot-pg-jsonb-text-v1/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026-07-14T10:00:00.000Z/)).toBeInTheDocument();
  });

  it("lets only an administrator confirm a reviewed version publication", async () => {
    const row = searchRow();
    const client = managementClient(row);
    render(
      <QuestionManagementWorkspace
        client={client}
        displayName="題庫管理員"
        role="administrator"
      />,
    );
    await screen.findByRole("heading", { name: "Is this a kite?" });

    fireEvent.click(screen.getByRole("button", { name: "發布此版本" }));
    fireEvent.change(screen.getByLabelText("治理說明"), {
      target: { value: "兩位教師複核完成，授權正確" },
    });
    fireEvent.click(screen.getByRole("button", { name: "確認發布版本" }));

    await waitFor(() =>
      expect(client.rpc).toHaveBeenCalledWith("publish_question_version", {
        p_question_id: row.question_id,
        p_question_version: 2,
        p_note: "兩位教師複核完成，授權正確",
      }),
    );
    expect(await screen.findByText("第 2 版已正式發布。" )).toBeInTheDocument();
  });

  it("loads immutable history before opening the prefilled revision editor", async () => {
    const row = searchRow({
      modality: "audio",
      question_type: "listening_choice",
      audio: {
        src: "/audio/yes-no-v2.mp3",
        transcript: "Is this a kite?",
      },
      source: {
        kind: "licensed",
        note: "教學音檔授權",
        usageRights: "licensed-for-publication",
        url: "https://example.edu/source-v2",
      },
    });
    const client = managementClient(row);
    render(
      <QuestionManagementWorkspace
        client={client}
        displayName="內容編輯王老師"
        role="content_editor"
      />,
    );
    await screen.findByRole("heading", { name: "Is this a kite?" });

    fireEvent.click(screen.getByRole("button", { name: "建立新版" }));

    expect(
      await screen.findByRole("heading", {
        name: "g4-yes-no-practice-01 版本比較",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "建立第 3 版草稿" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("題幹")).toHaveValue("Is this a kite?");
    expect(screen.getByText("/audio/yes-no-v1.mp3")).toBeInTheDocument();
    expect(screen.getByText("/audio/yes-no-v2.mp3")).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example\.edu\/source-v1/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/example\.edu\/source-v2/)).toBeInTheDocument();
    expect(client.rpc).toHaveBeenCalledWith("list_question_versions", {
      p_question_id: row.question_id,
    });
  });

  it("shows a blocking issue when the asset probe confirms a broken image", async () => {
    const row = searchRow({
      modality: "image",
      question_type: "image_choice",
      image: { src: "/assets/missing.webp", alt: "一個風箏" },
    });
    const assetProbe = vi.fn().mockResolvedValue([
      {
        questionId: row.question_id,
        version: row.question_version,
        kind: "image",
        status: "unavailable",
        detail: "HTTP 404",
      },
    ]);
    render(
      <QuestionManagementWorkspace
        assetProbe={assetProbe}
        client={managementClient(row)}
        displayName="題庫管理員"
        role="administrator"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "圖片資產無法存取" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "發布此版本" })).toBeDisabled();
    expect(
      screen.getByText("此版本仍有阻擋發布的品質問題，請先完成修正。"),
    ).toBeInTheDocument();
    expect(assetProbe).toHaveBeenCalledWith([
      expect.objectContaining({ id: row.question_id, image: row.image }),
    ]);
  });
});
