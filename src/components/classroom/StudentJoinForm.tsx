"use client";

import { ShieldCheck, UsersRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import styles from "./StudentClassroom.module.css";

const JOIN_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const MEMBER_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const JOIN_CODE_FILTER = /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g;
const MEMBER_CODE_FILTER = /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g;

export type StudentJoinRequest = Readonly<{
  joinCode: string;
  nickname: string;
  memberCode: string;
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
  const [memberCode, setMemberCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState<JoinedClassroomActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const normalizedNickname = nickname.trim();
  const canSubmit =
    JOIN_CODE_PATTERN.test(joinCode) &&
    (memberCode.length === 0 || MEMBER_CODE_PATTERN.test(memberCode)) &&
    normalizedNickname.length >= 1 &&
    normalizedNickname.length <= 12 &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await onJoin({
        joinCode,
        nickname: normalizedNickname,
        memberCode,
      });
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

  const nextStepHint = !JOIN_CODE_PATTERN.test(joinCode)
    ? "下一步：輸入老師給的六碼活動代碼"
    : memberCode.length > 0 && !MEMBER_CODE_PATTERN.test(memberCode)
      ? "下一步：把匿名學習代碼補滿六碼，或先清空留白"
      : normalizedNickname.length < 1
        ? "下一步：取一個匿名暱稱"
        : null;

  if (joined) {
    return (
      <section className="student-waiting-card" aria-live="polite">
        <span className="waiting-glyph" aria-hidden="true">
          <UsersRound />
        </span>
        <p className="eyebrow">{joined.grade} 年級合作任務</p>
        <h2>已加入 {joined.activityTitle}</h2>
        <strong>等待老師啟動任務</strong>
        <span className={styles.waitingDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
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
        <span className={styles.fieldHead}>
          <span aria-hidden="true" className={styles.stepBadge} data-step="1" />
          六碼活動代碼
        </span>
        <input
          aria-label="六碼活動代碼"
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
        <small
          aria-live="polite"
          className={`${styles.codeProgress} ${joinCode.length === 6 ? styles.codeProgressDone : ""}`}
        >
          {joinCode.length === 6 ? "六碼都到齊了！" : `已輸入 ${joinCode.length}／6 碼`}
        </small>
      </label>

      <label className="classroom-field">
        <span className={styles.fieldHead}>
          <span aria-hidden="true" className={styles.stepBadge} data-step="2" />
          匿名學習代碼（選填）
        </span>
        <input
          aria-label="匿名學習代碼（選填）"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          onChange={(event) =>
            setMemberCode(
              event.target.value
                .toUpperCase()
                .replace(MEMBER_CODE_FILTER, "")
                .slice(0, 6),
            )
          }
          placeholder="例如 B7K9Q2"
          spellCheck={false}
          type="text"
          value={memberCode}
        />
        <small>小組或個別任務請輸入老師給的代碼；全班任務可以留白。</small>
      </label>

      <label className="classroom-field">
        <span className={styles.fieldHead}>
          <span aria-hidden="true" className={styles.stepBadge} data-step="3" />
          匿名暱稱
        </span>
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
        {submitting ? "正在加入…" : "加入課堂任務"}
      </button>

      {!submitting && nextStepHint ? (
        <p className={styles.nextStepHint}>{nextStepHint}</p>
      ) : null}

      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
