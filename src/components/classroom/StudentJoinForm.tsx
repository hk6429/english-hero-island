"use client";

import { ShieldCheck, UsersRound } from "lucide-react";
import { type FormEvent, useState } from "react";

const JOIN_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const JOIN_CODE_FILTER = /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g;

export type StudentJoinRequest = Readonly<{
  joinCode: string;
  nickname: string;
}>;

export type JoinedClassroomActivity = Readonly<{
  activityId: string;
  participantId: string;
  activityTitle: string;
  grade: 3 | 4 | 5 | 6;
  participantState: "joined";
}>;

type Props = Readonly<{
  onJoin: (request: StudentJoinRequest) => Promise<JoinedClassroomActivity>;
  onJoined?: (activity: JoinedClassroomActivity) => void;
}>;

export function StudentJoinForm({ onJoin, onJoined }: Props) {
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState<JoinedClassroomActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const normalizedNickname = nickname.trim();
  const canSubmit =
    JOIN_CODE_PATTERN.test(joinCode) &&
    normalizedNickname.length >= 1 &&
    normalizedNickname.length <= 12 &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await onJoin({ joinCode, nickname: normalizedNickname });
      setJoined(result);
      onJoined?.(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "找不到這場任務，請和老師確認代碼。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (joined) {
    return (
      <section className="student-waiting-card" aria-live="polite">
        <span className="waiting-glyph" aria-hidden="true">
          <UsersRound />
        </span>
        <p className="eyebrow">{joined.grade} 年級合作任務</p>
        <h2>已加入 {joined.activityTitle}</h2>
        <strong>等待老師啟動任務</strong>
        <p>先把裝置留在這一頁。開始後，每個人的完成都會修復同一座班級能力島。</p>
      </section>
    );
  }

  return (
    <form className="student-join-form" onSubmit={handleSubmit}>
      <div className="classroom-form-heading">
        <div>
          <p className="eyebrow">加入班級任務</p>
          <h2>輸入老師給你的六碼</h2>
          <p>不用帳號、真實姓名、電子郵件或生日。</p>
        </div>
      </div>

      <label className="classroom-field join-code-field">
        <span>六碼活動代碼</span>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          maxLength={6}
          onChange={(event) =>
            setJoinCode(
              event.target.value.toUpperCase().replace(JOIN_CODE_FILTER, "").slice(0, 6),
            )
          }
          placeholder="例如 A7K9Q2"
          spellCheck={false}
          type="text"
          value={joinCode}
        />
      </label>

      <label className="classroom-field">
        <span>匿名暱稱</span>
        <input
          aria-label="匿名暱稱"
          autoComplete="off"
          maxLength={12}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="例如 小浪、星星 7 號"
          type="text"
          value={nickname}
        />
        <small>1–12 個字，只在這場活動中讓老師辨認。</small>
      </label>

      <div className="classroom-privacy-note">
        <ShieldCheck aria-hidden="true" />
        <p>畫面不顯示公開排行榜；需要協助時，只有這場活動的老師看得到狀態。</p>
      </div>

      <button className="primary-button" disabled={!canSubmit} type="submit">
        <UsersRound aria-hidden="true" />
        {submitting ? "正在加入…" : "加入全班任務"}
      </button>

      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
