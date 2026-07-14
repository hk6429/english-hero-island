"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Cable, KeyRound, MailCheck, ShieldAlert } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { TeacherClassroomManager } from "@/components/classroom/TeacherClassroomManager";
import {
  TeacherQuickActivityForm,
  type ClassroomMicroSkillOption,
  type CreatedQuickActivity,
  type TeacherClassroomOption,
} from "@/components/classroom/TeacherQuickActivityForm";
import { TeacherRecentActivities } from "@/components/classroom/TeacherRecentActivities";
import { TeacherRosterManager } from "@/components/classroom/TeacherRosterManager";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import {
  archiveTeacherClassroomWithSupabase,
  archiveClassroomMemberWithSupabase,
  createClassroomMemberWithSupabase,
  createTeacherClassroomWithSupabase,
  createClassroomActivityWithSupabase,
  listClassroomMicroSkillsWithSupabase,
  listClassroomMembersWithSupabase,
  listTeacherActivitiesWithSupabase,
  listTeacherClassroomsWithSupabase,
  type TeacherActivitySummary,
  type ClassroomMember,
} from "@/infrastructure/supabase/classroom-gateway";
import { TeacherActivityLiveRoom } from "./TeacherActivityLiveRoom";

type Props = Readonly<{
  client?: SupabaseClient | null;
}>;

export function TeacherClassroomWorkspace({ client }: Props) {
  const activeClient = useMemo(
    () => (client === undefined ? createBrowserSupabaseClient("teacher") : client),
    [client],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(activeClient));
  const [classrooms, setClassrooms] = useState<ReadonlyArray<TeacherClassroomOption>>([]);
  const [microSkills, setMicroSkills] = useState<ReadonlyArray<ClassroomMicroSkillOption>>([]);
  const [activities, setActivities] = useState<ReadonlyArray<TeacherActivitySummary>>([]);
  const [members, setMembers] = useState<ReadonlyArray<ClassroomMember>>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<TeacherActivitySummary | null>(null);
  const [selectedActivityJoinOpen, setSelectedActivityJoinOpen] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdActivity, setCreatedActivity] = useState<CreatedQuickActivity | null>(null);

  useEffect(() => {
    if (!activeClient) return;
    let mounted = true;

    void activeClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setMessage(error ? "無法確認教師登入狀態，請重新整理後再試。" : null);
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data } = activeClient.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [activeClient]);

  useEffect(() => {
    if (!activeClient || !session || session.user.is_anonymous) return;
    let mounted = true;
    const loadTimer = window.setTimeout(() => {
      if (!mounted) return;
      setLoadingWorkspace(true);
      setMessage(null);

      void listTeacherClassroomsWithSupabase(activeClient)
        .then(async (loadedClassrooms) => {
          if (!mounted) return;
          setClassrooms(loadedClassrooms);
          if (loadedClassrooms[0]) {
            const classroomId = loadedClassrooms[0].id;
            setSelectedClassroomId(classroomId);
            const [loadedSkills, loadedActivities, loadedMembers] = await Promise.all([
              listClassroomMicroSkillsWithSupabase(activeClient, classroomId),
              listTeacherActivitiesWithSupabase(activeClient, classroomId),
              listClassroomMembersWithSupabase(activeClient, classroomId),
            ]);
            if (mounted) {
              setMicroSkills(loadedSkills);
              setActivities(loadedActivities);
              setMembers(loadedMembers);
            }
          } else {
            setMicroSkills([]);
            setActivities([]);
            setMembers([]);
            setSelectedClassroomId(null);
          }
        })
        .catch((cause) => {
          if (mounted) {
            setMessage(cause instanceof Error ? cause.message : "教師工作區載入失敗。");
          }
        })
        .finally(() => {
          if (mounted) setLoadingWorkspace(false);
        });
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(loadTimer);
    };
  }, [activeClient, session]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeClient || !email.trim()) return;
    setMessage(null);

    const { error } = await activeClient.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/teacher` },
    });

    if (error) {
      setMessage("登入連結寄送失敗，請確認信箱或稍後再試。");
      return;
    }
    setMagicLinkSent(true);
  }

  async function loadMicroSkills(classroomId: string) {
    if (!activeClient) return;
    setLoadingWorkspace(true);
    setMessage(null);
    setSelectedClassroomId(classroomId);
    setCreatedActivity(null);
    setSelectedActivity(null);
    setMembers([]);
    try {
      const [loadedSkills, loadedActivities, loadedMembers] = await Promise.all([
        listClassroomMicroSkillsWithSupabase(activeClient, classroomId),
        listTeacherActivitiesWithSupabase(activeClient, classroomId),
        listClassroomMembersWithSupabase(activeClient, classroomId),
      ]);
      setMicroSkills(loadedSkills);
      setActivities(loadedActivities);
      setMembers(loadedMembers);
    } catch (cause) {
      setMicroSkills([]);
      setActivities([]);
      setMembers([]);
      setMessage(cause instanceof Error ? cause.message : "能力清單載入失敗。");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  async function reloadClassroomsAndSkills() {
    if (!activeClient) return;
    setLoadingWorkspace(true);
    setMessage(null);
    setCreatedActivity(null);
    setSelectedActivity(null);
    try {
      const loadedClassrooms = await listTeacherClassroomsWithSupabase(activeClient);
      setClassrooms(loadedClassrooms);
      const nextClassroom =
        loadedClassrooms.find((classroom) => classroom.id === selectedClassroomId) ??
        loadedClassrooms[0];
      if (nextClassroom) {
        setSelectedClassroomId(nextClassroom.id);
        const [loadedSkills, loadedActivities, loadedMembers] = await Promise.all([
          listClassroomMicroSkillsWithSupabase(activeClient, nextClassroom.id),
          listTeacherActivitiesWithSupabase(activeClient, nextClassroom.id),
          listClassroomMembersWithSupabase(activeClient, nextClassroom.id),
        ]);
        setMicroSkills(loadedSkills);
        setActivities(loadedActivities);
        setMembers(loadedMembers);
      } else {
        setMicroSkills([]);
        setActivities([]);
        setMembers([]);
        setSelectedClassroomId(null);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "教師工作區載入失敗。");
    } finally {
      setLoadingWorkspace(false);
    }
  }

  async function reloadMembers() {
    if (!activeClient || !selectedClassroomId) return;
    try {
      setMembers(
        await listClassroomMembersWithSupabase(activeClient, selectedClassroomId),
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "匿名學生名單載入失敗。");
    }
  }

  if (!activeClient) {
    return (
      <section className="classroom-setup-gate">
        <span className="setup-gate-icon" aria-hidden="true">
          <Cable />
        </span>
        <p className="eyebrow">教師課堂安全閘門</p>
        <h2>教師課堂後端尚未連線</h2>
        <p>
          專用 Supabase 專案、遷移與公開瀏覽器金鑰完成後，才會開放教師登入與跨裝置快派；目前不會產生無法跨裝置使用的假代碼。
        </p>
        <div className="setup-gate-note">
          <ShieldAlert aria-hidden="true" />
          <span>既有學生自主冒險不受影響，課堂資料也不會誤寫到其他專案。</span>
        </div>
      </section>
    );
  }

  if (checkingSession) {
    return <p className="loading-state">正在確認教師登入狀態…</p>;
  }

  if (!session || session.user.is_anonymous) {
    return (
      <form className="teacher-login-card" onSubmit={sendMagicLink}>
        <span className="setup-gate-icon" aria-hidden="true">
          <KeyRound />
        </span>
        <p className="eyebrow">核准教師登入</p>
        <h2>用學校信箱取得登入連結</h2>
        <p>只有系統中已核准的教師可以讀取班級與建立活動。</p>
        <label className="classroom-field">
          <span>教師電子郵件</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button className="primary-button" type="submit">
          寄送安全登入連結
        </button>
        {magicLinkSent ? (
          <p className="login-success" role="status">
            <MailCheck aria-hidden="true" />登入連結已寄出，請回到信箱點開。
          </p>
        ) : null}
        {message ? (
          <p className="inline-form-alert" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    );
  }

  if (loadingWorkspace && classrooms.length === 0) {
    return <p className="loading-state">正在載入可用班級與雙人複核題…</p>;
  }

  if (message) {
    return (
      <section className="classroom-setup-gate">
        <h2>教師工作區暫時無法使用</h2>
        <p>{message}</p>
      </section>
    );
  }

  const classroomManager = (
    <TeacherClassroomManager
      classrooms={classrooms}
      onArchive={(classroomId) =>
        archiveTeacherClassroomWithSupabase(activeClient, classroomId)
      }
      onChanged={() => void reloadClassroomsAndSkills()}
      onCreate={(request) => createTeacherClassroomWithSupabase(activeClient, request)}
    />
  );

  const recentActivities = (
    <TeacherRecentActivities
      activities={activities}
      onSelect={(activity) => {
        setCreatedActivity(null);
        setSelectedActivity(activity);
        setSelectedActivityJoinOpen(
          (activity.status === "waiting" || activity.status === "active") &&
            new Date(activity.joinClosesAt).getTime() > Date.now(),
        );
      }}
      selectedActivityId={createdActivity?.activityId ?? selectedActivity?.id ?? null}
    />
  );

  const rosterManager = selectedClassroomId ? (
    <TeacherRosterManager
      classroomId={selectedClassroomId}
      members={members}
      onArchive={(memberId) =>
        archiveClassroomMemberWithSupabase(activeClient, memberId)
      }
      onChanged={() => void reloadMembers()}
      onCreate={(request) => createClassroomMemberWithSupabase(activeClient, request)}
    />
  ) : null;

  const selectedActivityRoom = selectedActivity ? (
    <TeacherActivityLiveRoom
      key={selectedActivity.id}
      activityId={selectedActivity.id}
      client={activeClient}
      initialJoinOpen={selectedActivityJoinOpen}
      initialStatus={selectedActivity.status}
      joinCode={selectedActivity.joinCode}
    />
  ) : null;

  if (classrooms.length === 0) return classroomManager;

  if (microSkills.length === 0) {
    return (
      <div className="teacher-workspace-stack">
        {classroomManager}
        {rosterManager}
        {recentActivities}
        {selectedActivityRoom}
        <section className="classroom-setup-gate">
          <h2>這個班級尚無可派的雙人複核題</h2>
          <p>至少要有三題正式發布且具兩筆複核紀錄，能力才會出現在快派清單。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="teacher-workspace-stack">
      {classroomManager}
      {rosterManager}
      {recentActivities}
      <TeacherQuickActivityForm
        classrooms={classrooms}
        members={members}
        microSkills={microSkills}
        onClassroomChange={(classroomId) => void loadMicroSkills(classroomId)}
        onCreate={(request) =>
          createClassroomActivityWithSupabase(activeClient, request)
        }
        onCreated={(activity) => {
          setSelectedActivity(null);
          setCreatedActivity(activity);
        }}
      />
      {createdActivity ? (
        <TeacherActivityLiveRoom
          activityId={createdActivity.activityId}
          client={activeClient}
          joinCode={createdActivity.joinCode}
        />
      ) : null}
      {selectedActivityRoom}
    </div>
  );
}
