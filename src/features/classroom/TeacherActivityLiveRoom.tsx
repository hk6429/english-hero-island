"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Play, Radio, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { TeacherLiveStatusPanel } from "@/components/classroom/TeacherLiveStatusPanel";
import type { ClassroomStatusInput } from "@/domain/classroom/project-classroom-status";
import {
  closeClassroomJoinWithSupabase,
  endClassroomActivityWithSupabase,
  listActivityParticipantStatusWithSupabase,
  startClassroomActivityWithSupabase,
} from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  client: SupabaseClient;
  activityId: string;
  joinCode: string;
  initialStatus?: "waiting" | "active" | "completed" | "ended";
  initialJoinOpen?: boolean;
}>;

export function TeacherActivityLiveRoom({
  client,
  activityId,
  joinCode,
  initialStatus = "waiting",
  initialJoinOpen = true,
}: Props) {
  const [participants, setParticipants] = useState<ReadonlyArray<ClassroomStatusInput>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<
    "waiting" | "active" | "completed" | "ended"
  >(initialStatus);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [joinOpen, setJoinOpen] = useState(initialJoinOpen);
  const [closingJoin, setClosingJoin] = useState(false);

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

  async function endActivity() {
    setEnding(true);
    setError(null);
    try {
      await endClassroomActivityWithSupabase(client, activityId);
      setActivityStatus("ended");
      setConfirmingEnd(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "活動結束失敗。");
    } finally {
      setEnding(false);
    }
  }

  async function closeJoin() {
    setClosingJoin(true);
    setError(null);
    try {
      await closeClassroomJoinWithSupabase(client, activityId);
      setJoinOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "停止新加入失敗。");
    } finally {
      setClosingJoin(false);
    }
  }

  const statusLabel =
    activityStatus === "active"
      ? "任務進行中"
      : activityStatus === "completed"
        ? "活動已完成"
        : activityStatus === "ended"
          ? "活動已結束"
          : "等待學生加入";

  return (
    <div className="teacher-live-room">
      <div className="live-room-code" role="status">
        <Radio aria-hidden="true" />
        <strong>活動碼 {joinCode}</strong>
        <span>{statusLabel}</span>
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
        ) : activityStatus === "active" ? (
          <div className="live-room-active-actions">
            <strong className="activity-active-note">全班任務已啟動</strong>
            {joinOpen ? (
              <button
                className="secondary-button"
                disabled={closingJoin}
                onClick={() => void closeJoin()}
                type="button"
              >
                {closingJoin ? "正在停止…" : "停止新加入"}
              </button>
            ) : (
              <span className="join-closed-note" role="status">
                新加入已關閉
              </span>
            )}
            <button
              className="secondary-button danger-button"
              onClick={() => setConfirmingEnd(true)}
              type="button"
            >
              <Square aria-hidden="true" />結束活動
            </button>
          </div>
        ) : (
          <strong className="activity-ended-note">
            {activityStatus === "completed" ? "活動已完成" : "活動已安全結束"}
          </strong>
        )}
        <p>
          {activityStatus === "waiting"
            ? "啟動前，學生只會看到安全等待頁。"
            : activityStatus === "active"
              ? "學生會進入同一場合作任務；看板仍不顯示名次。"
              : "學生不能再加入或作答，已保存的學習事件仍保留。"}
        </p>
      </div>
      {confirmingEnd && activityStatus === "active" ? (
        <section className="activity-end-confirmation" role="alert">
          <strong>要結束這場活動嗎？</strong>
          <p>結束後學生不能再加入或送出新答案，已保存的學習事件不會刪除。</p>
          <div>
            <button
              className="secondary-button danger-button"
              disabled={ending}
              onClick={() => void endActivity()}
              type="button"
            >
              {ending ? "正在結束…" : "確認結束活動"}
            </button>
            <button
              className="text-button"
              disabled={ending}
              onClick={() => setConfirmingEnd(false)}
              type="button"
            >
              保持進行
            </button>
          </div>
        </section>
      ) : null}
      {loading ? <p className="loading-state">正在建立即時課堂看板…</p> : null}
      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && activityStatus !== "ended" ? (
        <TeacherLiveStatusPanel participants={participants} />
      ) : null}
    </div>
  );
}
