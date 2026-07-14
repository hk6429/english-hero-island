"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Play, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { TeacherLiveStatusPanel } from "@/components/classroom/TeacherLiveStatusPanel";
import type { ClassroomStatusInput } from "@/domain/classroom/project-classroom-status";
import {
  listActivityParticipantStatusWithSupabase,
  startClassroomActivityWithSupabase,
} from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  client: SupabaseClient;
  activityId: string;
  joinCode: string;
}>;

export function TeacherActivityLiveRoom({ client, activityId, joinCode }: Props) {
  const [participants, setParticipants] = useState<ReadonlyArray<ClassroomStatusInput>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<"waiting" | "active">("waiting");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshParticipants() {
      try {
        const nextParticipants = await listActivityParticipantStatusWithSupabase(
          client,
          activityId,
        );
        if (mounted) {
          setParticipants(nextParticipants);
          setError(null);
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : "課堂狀態更新失敗。");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void refreshParticipants();

    const channel = client
      .channel(`classroom-activity-${activityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_participants",
          filter: `activity_id=eq.${activityId}`,
        },
        () => void refreshParticipants(),
      )
      .subscribe();

    return () => {
      mounted = false;
      void client.removeChannel(channel);
    };
  }, [activityId, client]);

  async function startActivity() {
    setStarting(true);
    setError(null);
    try {
      await startClassroomActivityWithSupabase(client, activityId);
      setActivityStatus("active");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "活動啟動失敗。");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="teacher-live-room">
      <div className="live-room-code" role="status">
        <Radio aria-hidden="true" />
        <strong>活動碼 {joinCode}</strong>
        <span>{activityStatus === "active" ? "任務進行中" : "等待學生加入"}</span>
      </div>
      <div className="live-room-actions">
        {activityStatus === "waiting" ? (
          <button
            className="primary-button"
            disabled={starting}
            onClick={() => void startActivity()}
            type="button"
          >
            <Play aria-hidden="true" />
            {starting ? "正在啟動…" : "啟動全班任務"}
          </button>
        ) : (
          <strong className="activity-active-note">全班任務已啟動</strong>
        )}
        <p>
          {activityStatus === "waiting"
            ? "啟動前，學生只會看到安全等待頁。"
            : "學生會進入同一場合作任務；看板仍不顯示名次。"}
        </p>
      </div>
      {loading ? <p className="loading-state">正在建立即時課堂看板…</p> : null}
      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
      {!loading ? <TeacherLiveStatusPanel participants={participants} /> : null}
    </div>
  );
}
