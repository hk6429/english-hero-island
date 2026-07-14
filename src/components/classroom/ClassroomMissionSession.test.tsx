import type { SupabaseClient } from "@supabase/supabase-js";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryPendingSubmissionStore } from "@/infrastructure/classroom/MemoryPendingSubmissionStore";
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
        p_device_event_id: deviceEventId,
      }),
    );
    expect(await pendingStore.list(activityId, participantId)).toEqual([]);
  });
});
