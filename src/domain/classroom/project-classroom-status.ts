import type { ClassroomParticipant } from "./join-classroom-activity";

const stateLabels: Readonly<Record<ClassroomParticipant["state"], string>> = {
  joined: "已加入",
  in_progress: "進行中",
  completed: "已完成",
  may_need_help: "可能需要協助",
};

export type ClassroomStatusProjection = Readonly<{
  counts: Readonly<{
    joined: number;
    inProgress: number;
    completed: number;
    mayNeedHelp: number;
    total: number;
  }>;
  participants: ReadonlyArray<
    Readonly<{
      nickname: string;
      state: ClassroomParticipant["state"];
      label: string;
    }>
  >;
}>;

export type ClassroomStatusInput = Pick<ClassroomParticipant, "nickname" | "state">;

export function projectClassroomStatus(
  participants: ReadonlyArray<ClassroomStatusInput>,
): ClassroomStatusProjection {
  return {
    counts: {
      joined: participants.filter((participant) => participant.state === "joined").length,
      inProgress: participants.filter((participant) => participant.state === "in_progress").length,
      completed: participants.filter((participant) => participant.state === "completed").length,
      mayNeedHelp: participants.filter((participant) => participant.state === "may_need_help").length,
      total: participants.length,
    },
    participants: participants.map((participant) => ({
      nickname: participant.nickname,
      state: participant.state,
      label: stateLabels[participant.state],
    })),
  };
}
