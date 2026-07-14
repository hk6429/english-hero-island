import { CheckCircle2, CircleDashed, HandHeart, LoaderCircle } from "lucide-react";
import {
  projectClassroomStatus,
  type ClassroomStatusInput,
} from "@/domain/classroom/project-classroom-status";

type Props = Readonly<{
  participants: ReadonlyArray<ClassroomStatusInput>;
}>;

const stateClassNames = {
  joined: "live-state-joined",
  in_progress: "live-state-progress",
  completed: "live-state-completed",
  may_need_help: "live-state-support",
} as const;

export function TeacherLiveStatusPanel({ participants }: Props) {
  const projection = projectClassroomStatus(participants);

  return (
    <section className="teacher-live-panel" aria-labelledby="live-status-title">
      <div className="live-panel-heading">
        <div>
          <p className="eyebrow">即時課堂狀態</p>
          <h2 id="live-status-title">看見誰需要靠近，不比較誰最快</h2>
        </div>
        <span className="live-total">共 {projection.counts.total} 人</span>
      </div>

      <div className="live-count-grid">
        <article>
          <CircleDashed aria-hidden="true" />
          <span>已加入</span>
          <strong>{projection.counts.joined}</strong>
        </article>
        <article>
          <LoaderCircle aria-hidden="true" />
          <span>進行中</span>
          <strong>{projection.counts.inProgress}</strong>
        </article>
        <article>
          <CheckCircle2 aria-hidden="true" />
          <span>已完成</span>
          <strong>{projection.counts.completed}</strong>
        </article>
        <article className="support-count-card">
          <HandHeart aria-hidden="true" />
          <span>可能需要協助</span>
          <strong>{projection.counts.mayNeedHelp}</strong>
        </article>
      </div>

      {projection.participants.length > 0 ? (
        <ul className="live-participant-list" aria-label="學生任務狀態">
          {projection.participants.map((participant, index) => (
            <li key={`${participant.nickname}-${index}`}>
              <strong>{participant.nickname}</strong>
              <span className={stateClassNames[participant.state]}>
                狀態：{participant.label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="live-empty">活動碼已準備好，等待第一位學生加入。</p>
      )}
    </section>
  );
}
