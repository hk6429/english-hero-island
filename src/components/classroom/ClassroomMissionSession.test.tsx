import type { SupabaseClient } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassroomMissionSession } from "./ClassroomMissionSession";

describe("ClassroomMissionSession", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "77777777-7777-4777-8777-777777777777",
    });
  });

  it("reveals server feedback only after the student submits an option", async () => {
    const user = userEvent.setup();
    const rpc = vi.fn().mockImplementation(async (name: string) => {
      if (name === "get_student_activity_questions") {
        return {
          data: [
            {
              position: 1,
              question_id: "g4-yes-no-practice-01",
              question_version: 1,
              grade: 4,
              micro_skill: "yes-no-questions",
              purpose: "practice",
              modality: "text",
              question_type: "multiple_choice",
              prompt: "Is this a pen?",
              options: [
                { id: "a", text: "Yes, it is." },
                { id: "b", text: "Yes, I am." },
              ],
              audio_src: null,
              image_src: null,
              image_alt: null,
            },
          ],
          error: null,
        };
      }
      return {
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
    });
    const client = { rpc } as unknown as SupabaseClient;

    render(
      <ClassroomMissionSession
        activityId="33333333-3333-4333-8333-333333333333"
        client={client}
        participantId="44444444-4444-4444-8444-444444444444"
      />,
    );

    expect(await screen.findByText("Is this a pen?")).toBeInTheDocument();
    expect(screen.queryByText("this 代表單數物品，使用 it 回答。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, it is." }));

    expect(rpc).toHaveBeenCalledWith("submit_classroom_response", {
      p_activity_id: "33333333-3333-4333-8333-333333333333",
      p_participant_id: "44444444-4444-4444-8444-444444444444",
      p_question_id: "g4-yes-no-practice-01",
      p_question_version: 1,
      p_selected_option_id: "a",
      p_device_event_id: "77777777-7777-4777-8777-777777777777",
    });
    expect(await screen.findByRole("heading", { name: "你修復了一格能力島！" })).toBeInTheDocument();
    expect(screen.getByText("this 代表單數物品，使用 it 回答。")).toBeInTheDocument();
    expect(screen.getByText("全班已修復 3 格")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "完成合作任務" }));
    expect(
      screen.getByRole("heading", { name: "你完成了這次合作貢獻" }),
    ).toBeInTheDocument();
  });
});
