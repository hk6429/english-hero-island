"use client";

import { Clock3, Radio } from "lucide-react";
import type { TeacherActivitySummary } from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  activities: ReadonlyArray<TeacherActivitySummary>;
  selectedActivityId: string | null;
  onSelect: (activity: TeacherActivitySummary) => void;
}>;

const statusLabels = {
  waiting: "等待加入",
  active: "進行中",
  completed: "已完成",
  ended: "已結束",
} as const;

const audienceLabels = {
  whole_class: "全班",
  small_group: "小組",
  individual: "個別",
} as const;

export function TeacherRecentActivities({
  activities,
  selectedActivityId,
  onSelect,
}: Props) {
  return (
    <section className="teacher-recent-activities" aria-labelledby="recent-activities-title">
      <div className="classroom-form-heading">
        <div>
          <p className="eyebrow">最近活動</p>
          <h2 id="recent-activities-title">重新整理後，也能接回原來的課堂</h2>
        </div>
        <Clock3 aria-hidden="true" />
      </div>

      {activities.length > 0 ? (
        <ul className="recent-activity-list">
          {activities.map((activity) => (
            <li key={activity.id} data-selected={selectedActivityId === activity.id}>
              <div className="recent-activity-main">
                <strong>{activity.title}</strong>
                <span>活動碼 {activity.joinCode}</span>
              </div>
              <div className="recent-activity-meta">
                <span className={`activity-status-chip status-${activity.status}`}>
                  {statusLabels[activity.status]}
                </span>
                <span>{audienceLabels[activity.audience]}・{activity.questionCount} 題</span>
              </div>
              <button
                aria-label={`開啟${activity.title}`}
                className="secondary-button"
                onClick={() => onSelect(activity)}
                type="button"
              >
                <Radio aria-hidden="true" />開啟活動
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-help">這個班級還沒有活動；建立後會保留在這裡。</p>
      )}
    </section>
  );
}
