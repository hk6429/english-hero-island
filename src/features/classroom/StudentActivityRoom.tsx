"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, RefreshCw, Swords, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ClassroomMissionSession } from "@/components/classroom/ClassroomMissionSession";
import {
  getStudentActivityStateWithSupabase,
  type StudentActivityState,
} from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  client: SupabaseClient;
  activityId: string;
  participantId: string;
}>;

export function StudentActivityRoom({ client, activityId, participantId }: Props) {
  const [activity, setActivity] = useState<StudentActivityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setActivity(await getStudentActivityStateWithSupabase(client, activityId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "任務狀態更新失敗。");
    } finally {
      setLoading(false);
    }
  }, [activityId, client]);

  useEffect(() => {
    const firstRefresh = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      window.clearTimeout(firstRefresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  if (!activity) {
    return (
      <section className="student-waiting-card">
        <p>{loading ? "正在確認老師是否已啟動…" : "暫時無法取得任務。"}</p>
        {error ? (
          <p className="inline-form-alert" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (activity.activityStatus === "waiting") {
    return (
      <section className="student-waiting-card" data-participant-ready={Boolean(participantId)}>
        <span className="waiting-glyph" aria-hidden="true">
          <UsersRound />
        </span>
        <p className="eyebrow">{activity.grade} 年級・{activity.activityTitle}</p>
        <h2>等待老師啟動任務</h2>
        <p>你已安全加入。開始後，每一題都會幫全班修復同一座能力島。</p>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw aria-hidden="true" />
          {loading ? "檢查中…" : "再檢查一次"}
        </button>
        {error ? (
          <p className="inline-form-alert" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (activity.activityStatus === "active") {
    if (activity.answeredCount >= activity.questionCount) {
      return (
        <section className="classroom-mission-finished">
          <span className="waiting-glyph" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <p className="eyebrow">合作任務完成</p>
          <h2>你完成了這次合作貢獻</h2>
          <p>
            你的每一題都已安全保存。需要再確認的能力會由老師協助，不會變成公開排名。
          </p>
          <div className="shared-story-stats" aria-label="完成時的全班共同進度">
            <strong>全班已修復 {activity.repairedPoints} 格</strong>
            <span>Boss 護甲 {activity.bossArmor}</span>
          </div>
        </section>
      );
    }

    return (
      <div className="student-classroom-stack">
        <section className="classroom-mission-entry">
          <span className="waiting-glyph" aria-hidden="true">
            <Swords />
          </span>
          <p className="eyebrow">{activity.grade} 年級・{activity.questionCount} 題合作任務</p>
          <h2>全班合作關卡已啟動</h2>
          <p>{activity.activityTitle}</p>
          <div className="shared-story-stats" aria-label="全班共同進度">
            <span>全班已完成 {activity.contributionCount} 次貢獻</span>
            <strong>全班已修復 {activity.repairedPoints} 格</strong>
            <span>Boss 護甲 {activity.bossArmor}</span>
          </div>
          <p className="integrity-note">
            這裡只看全班共同修復，不顯示誰最快，也不比較個人名次。
          </p>
        </section>
        <ClassroomMissionSession
          activityId={activityId}
          client={client}
          participantId={participantId}
        />
      </div>
    );
  }

  return (
    <section className="student-waiting-card">
      <h2>這場合作任務已結束</h2>
      <p>共同修復紀錄已保存，請回首頁繼續自己的能力島冒險。</p>
    </section>
  );
}
