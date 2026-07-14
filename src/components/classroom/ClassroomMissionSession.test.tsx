import type { SupabaseClient } from "@supabase/supabase-js";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryPendingSubmissionStore } from "@/infrastructure/classroom/MemoryPendingSubmissionStore";
import { MemoryClassroomSupportEvidenceStore } from "@/infrastructure/classroom/MemoryClassroomSupportEvidenceStore";
import type { PendingClassroomSubmission } from "@/infrastructure/classroom/PendingClassroomSubmissionStore";
import type { ClassroomStudentQuestion } from "@/infrastructure/supabase/classroom-gateway";
import { ClassroomMissionSession } from "./ClassroomMissionSession";

const activityId = "33333333-3333-4333-8333-333333333333";
const participantId = "44444444-4444-4444-8444-444444444444";
const deviceEventId = "77777777-7777-4777-8777-777777777777";

const question: ClassroomStudentQuestion = {
  position: 1,
  id: "g4-yes-no-practice-01",
  version: 1,
  grade: 4,
  microSkill: "yes-no-questions",
  purpose: "practice",
  modality: "text",
  questionType: "multiple_choice",
  prompt: "Is this a pen?",
  options: [
    { id: "a", text: "Yes, it is." },
    { id: "b", text: "Yes, I am." },
  ],
};

const questionRow = {
  position: question.position,
  question_id: question.id,
  question_version: question.version,
  grade: question.grade,
  micro_skill: question.microSkill,
  purpose: question.purpose,
  modality: question.modality,
  question_type: question.questionType,
  prompt: question.prompt,
  options: question.options,
  audio_src: null,
  image_src: null,
  image_alt: null,
};

const successfulResponse = {
  data: [
    {
      submitted_response_id: "66666666-6666-4666-8666-666666666666",
      learning_outcome: "independent_correct",
      answer_explanation: "this 代表單數物品，使用 it 回答。",
      answer_correct_option_id: "a",
      shared_repaired_points: 3,
      shared_boss_armor: 2,
      updated_participant_state: "completed",
    },
  ],
  error: null,
};

function createRpc(questionRows: ReadonlyArray<typeof questionRow> = [questionRow]) {
  return vi.fn().mockImplementation(async (name: string) => {
    if (name === "get_student_activity_questions") {
      return { data: questionRows, error: null };
    }
    return successfulResponse;
  });
}

describe("ClassroomMissionSession", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => deviceEventId,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reveals server feedback only after the student submits an option", async () => {
    const user = userEvent.setup();
    const rpc = createRpc();
    const client = { rpc } as unknown as SupabaseClient;
    const pendingStore = new MemoryPendingSubmissionStore();

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={pendingStore}
      />,
    );

    expect(await screen.findByText(question.prompt)).toBeInTheDocument();
    expect(screen.queryByText("this 代表單數物品，使用 it 回答。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, it is." }));

    expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
      p_activity_id: activityId,
      p_participant_id: participantId,
      p_question_id: question.id,
      p_question_version: question.version,
      p_selected_option_id: "a",
      p_hints_used: 0,
      p_device_event_id: deviceEventId,
    });
    expect(await screen.findByRole("heading", { name: "你修復了一格能力島！" })).toBeInTheDocument();
    expect(screen.getByText("this 代表單數物品，使用 it 回答。")).toBeInTheDocument();
    expect(screen.getByText("全班已修復 3 格")).toBeInTheDocument();
    expect(await pendingStore.list(activityId, participantId)).toEqual([]);

    await user.click(screen.getByRole("button", { name: "完成合作任務" }));
    expect(
      screen.getByRole("heading", { name: "你完成了這次合作貢獻" }),
    ).toBeInTheDocument();
  });

  it("submits a revealed listening transcript as assisted classroom evidence", async () => {
    const user = userEvent.setup();
    const audioQuestionRow = {
      ...questionRow,
      question_id: "g4-listening-letter-b-01",
      modality: "audio" as const,
      question_type: "listening_choice" as const,
      prompt: "Listen. Which letter do you hear?",
      options: [
        { id: "a", text: "B" },
        { id: "b", text: "D" },
      ],
      audio_src: "tts:B",
    };
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "get_student_activity_questions") {
        return { data: [audioQuestionRow], error: null };
      }
      return {
        ...successfulResponse,
        data: [
          {
            ...successfulResponse.data[0],
            learning_outcome: "assisted_correct",
            answer_correct_option_id: "a",
          },
        ],
      };
    });
    const client = { rpc } as unknown as SupabaseClient;

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={new MemoryPendingSubmissionStore()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "顯示文字輔助" }));
    await user.click(screen.getByRole("button", { name: /^B$/ }));

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
        p_activity_id: activityId,
        p_participant_id: participantId,
        p_question_id: audioQuestionRow.question_id,
        p_question_version: question.version,
        p_selected_option_id: "a",
        p_hints_used: 1,
        p_device_event_id: deviceEventId,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "你用文字輔助完成了這題" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("這題的正確答案是：B")).not.toBeInTheDocument();
  });

  it("keeps revealed transcript evidence assisted after reload before answer", async () => {
    const user = userEvent.setup();
    const supportStore = new MemoryClassroomSupportEvidenceStore();
    const audioQuestionRow = {
      ...questionRow,
      question_id: "g4-listening-letter-b-01",
      modality: "audio" as const,
      question_type: "listening_choice" as const,
      prompt: "Listen. Which letter do you hear?",
      options: [
        { id: "a", text: "B" },
        { id: "b", text: "D" },
      ],
      audio_src: "tts:B",
    };
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "get_student_activity_questions") {
        return { data: [audioQuestionRow], error: null };
      }
      return {
        ...successfulResponse,
        data: [
          {
            ...successfulResponse.data[0],
            learning_outcome: "assisted_correct",
          },
        ],
      };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const firstPage = render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={new MemoryPendingSubmissionStore()}
        supportStore={supportStore}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "顯示文字輔助" }));
    await waitFor(() =>
      expect(
        supportStore.get({
          activityId,
          participantId,
          questionId: audioQuestionRow.question_id,
          questionVersion: audioQuestionRow.question_version,
        }),
      ).resolves.toBe(1),
    );
    firstPage.unmount();

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={new MemoryPendingSubmissionStore()}
        supportStore={supportStore}
      />,
    );
    await user.click(await screen.findByRole("button", { name: /^B$/ }));

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
        p_activity_id: activityId,
        p_participant_id: participantId,
        p_question_id: audioQuestionRow.question_id,
        p_question_version: audioQuestionRow.question_version,
        p_selected_option_id: "a",
        p_hints_used: 1,
        p_device_event_id: deviceEventId,
      }),
    );
  });

  it("stores an offline answer locally and retries it automatically when online", async () => {
    const online = vi
      .spyOn(window.navigator, "onLine", "get")
      .mockReturnValue(false);
    const user = userEvent.setup();
    const rpc = createRpc();
    const client = { rpc } as unknown as SupabaseClient;
    const pendingStore = new MemoryPendingSubmissionStore();

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={pendingStore}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Yes, it is." }),
    );

    expect(
      await screen.findByText("答案已安全保存在這台裝置，恢復連線後會自動送出。"),
    ).toBeInTheDocument();
    expect(rpc.mock.calls.filter(([name]) => name === "submit_classroom_response"))
      .toHaveLength(0);
    expect(await pendingStore.list(activityId, participantId)).toEqual([
      expect.objectContaining({
        activityId,
        participantId,
        deviceEventId,
        selectedOptionId: "a",
        question,
      }),
    ]);
    expect(screen.queryByText("this 代表單數物品，使用 it 回答。")).not.toBeInTheDocument();

    online.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("online")));

    expect(await screen.findByRole("heading", { name: "你修復了一格能力島！" })).toBeInTheDocument();
    expect(await pendingStore.list(activityId, participantId)).toEqual([]);
  });

  it("restores a queued answer after reload and reuses the same event id", async () => {
    const pendingStore = new MemoryPendingSubmissionStore();
    const pending: PendingClassroomSubmission = {
      activityId,
      participantId,
      deviceEventId,
      selectedOptionId: "a",
      hintsUsed: 0,
      queuedAt: "2026-07-14T10:00:00.000Z",
      question,
    };
    await pendingStore.put(pending);
    const rpc = createRpc([]);
    const client = { rpc } as unknown as SupabaseClient;

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={pendingStore}
      />,
    );

    expect(await screen.findByRole("heading", { name: "你修復了一格能力島！" })).toBeInTheDocument();
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
        p_activity_id: activityId,
        p_participant_id: participantId,
        p_question_id: question.id,
        p_question_version: question.version,
        p_selected_option_id: "a",
        p_hints_used: 0,
        p_device_event_id: deviceEventId,
      }),
    );
    expect(await pendingStore.list(activityId, participantId)).toEqual([]);
  });

  it("treats a legacy audio queue without support metadata conservatively", async () => {
    const pendingStore = new MemoryPendingSubmissionStore();
    const audioQuestion: ClassroomStudentQuestion = {
      ...question,
      id: "g4-listening-letter-b-01",
      modality: "audio",
      questionType: "listening_choice",
      prompt: "Listen. Which letter do you hear?",
      options: [
        { id: "a", text: "B" },
        { id: "b", text: "D" },
      ],
      audio: { src: "https://assets.example.test/letter-b.mp3" },
    };
    await pendingStore.put({
      activityId,
      participantId,
      deviceEventId,
      selectedOptionId: "a",
      queuedAt: "2026-07-14T10:00:00.000Z",
      question: audioQuestion,
    } as unknown as PendingClassroomSubmission);
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "get_student_activity_questions") {
        return { data: [], error: null };
      }
      return {
        ...successfulResponse,
        data: [
          {
            ...successfulResponse.data[0],
            learning_outcome: "assisted_correct",
          },
        ],
      };
    });
    const client = { rpc } as unknown as SupabaseClient;

    render(
      <ClassroomMissionSession
        activityId={activityId}
        client={client}
        participantId={participantId}
        pendingStore={pendingStore}
      />,
    );

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
        p_activity_id: activityId,
        p_participant_id: participantId,
        p_question_id: audioQuestion.id,
        p_question_version: audioQuestion.version,
        p_selected_option_id: "a",
        p_hints_used: 1,
        p_device_event_id: deviceEventId,
      }),
    );
  });
});
