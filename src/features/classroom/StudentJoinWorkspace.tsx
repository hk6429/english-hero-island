"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Cable, ShieldAlert } from "lucide-react";
import { useState } from "react";
import {
  StudentJoinForm,
  type JoinedClassroomActivity,
} from "@/components/classroom/StudentJoinForm";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import { joinClassroomWithSupabase } from "@/infrastructure/supabase/classroom-gateway";
import { StudentActivityRoom } from "./StudentActivityRoom";

type Props = Readonly<{
  client?: SupabaseClient | null;
}>;

export function StudentJoinWorkspace({
  client = createBrowserSupabaseClient("student"),
}: Props) {
  const [joinedActivity, setJoinedActivity] = useState<JoinedClassroomActivity | null>(null);

  if (!client) {
    return (
      <section className="classroom-setup-gate">
        <span className="setup-gate-icon" aria-hidden="true">
          <Cable />
        </span>
        <p className="eyebrow">課堂版安全閘門</p>
        <h2>課堂連線尚未設定</h2>
        <p>
          專用 Supabase 專案、資料庫遷移與公開瀏覽器金鑰完成後，這裡才會開放匿名加入；目前不會產生假的活動代碼或加入結果。
        </p>
        <div className="setup-gate-note">
          <ShieldAlert aria-hidden="true" />
          <span>自主練習仍可使用，進度只留在這台裝置。</span>
        </div>
        <Link className="secondary-button secondary-link" href="/">
          回自主冒險
        </Link>
      </section>
    );
  }

  if (joinedActivity) {
    return (
      <StudentActivityRoom
        activityId={joinedActivity.activityId}
        client={client}
        participantId={joinedActivity.participantId}
      />
    );
  }

  return (
    <StudentJoinForm
      onJoin={(request) => joinClassroomWithSupabase(client, request)}
      onJoined={setJoinedActivity}
    />
  );
}
