"use client";

import { Archive, UserRoundPlus, UsersRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import type {
  ArchivedClassroomMember,
  ClassroomMember,
  CreateClassroomMemberRequest,
} from "@/infrastructure/supabase/classroom-gateway";

const MEMBER_CODE_FILTER = /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g;

type Props = Readonly<{
  classroomId: string;
  members: ReadonlyArray<ClassroomMember>;
  onCreate: (request: CreateClassroomMemberRequest) => Promise<ClassroomMember>;
  onArchive: (memberId: string) => Promise<ArchivedClassroomMember>;
  onChanged?: () => void;
}>;

export function TeacherRosterManager({
  classroomId,
  members,
  onCreate,
  onArchive,
  onChanged,
}: Props) {
  const [displayAlias, setDisplayAlias] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    displayAlias.trim().length >= 1 &&
    displayAlias.trim().length <= 24 &&
    memberCode.length >= 2 &&
    memberCode.length <= 8 &&
    groupLabel.trim().length <= 24 &&
    !submitting;

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        classroomId,
        displayAlias: displayAlias.trim(),
        memberCode,
        groupLabel: groupLabel.trim(),
      });
      setDisplayAlias("");
      setMemberCode("");
      setGroupLabel("");
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "匿名學生新增失敗。");
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveMember(memberId: string) {
    setArchivingId(memberId);
    setError(null);
    try {
      await onArchive(memberId);
      setConfirmingArchiveId(null);
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "匿名學生封存失敗。");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <section className="teacher-roster-manager" aria-labelledby="teacher-roster-title">
      <div className="classroom-form-heading">
        <div>
          <p className="eyebrow">匿名名單</p>
          <h2 id="teacher-roster-title">用學習代碼建立小組與個別指派</h2>
          <p>只建立別名、代碼與小組；請勿填入真實姓名、電子郵件或生日。</p>
        </div>
        <UsersRound aria-hidden="true" />
      </div>

      <form className="teacher-roster-form" onSubmit={createMember}>
        <label className="classroom-field">
          <span>匿名別名</span>
          <input
            maxLength={24}
            onChange={(event) => setDisplayAlias(event.target.value)}
            placeholder="例如 海星 8 號"
            required
            type="text"
            value={displayAlias}
          />
        </label>
        <label className="classroom-field">
          <span>學習代碼</span>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={8}
            onChange={(event) =>
              setMemberCode(
                event.target.value
                  .toUpperCase()
                  .replace(MEMBER_CODE_FILTER, "")
                  .slice(0, 8),
              )
            }
            placeholder="例如 C8"
            required
            spellCheck={false}
            type="text"
            value={memberCode}
          />
        </label>
        <label className="classroom-field">
          <span>小組名稱（選填）</span>
          <input
            maxLength={24}
            onChange={(event) => setGroupLabel(event.target.value)}
            placeholder="例如 海洋組"
            type="text"
            value={groupLabel}
          />
        </label>
        <button className="secondary-button" disabled={!canCreate} type="submit">
          <UserRoundPlus aria-hidden="true" />
          {submitting ? "正在新增…" : "新增匿名學生"}
        </button>
      </form>

      {members.length > 0 ? (
        <ul className="teacher-roster-list" aria-label="匿名學生名單">
          {members.map((member) => (
            <li key={member.id}>
              <div>
                <strong>{member.alias}</strong>
                <span>
                  代碼 {member.code}
                  {member.groupLabel ? `・${member.groupLabel}` : "・未分組"}
                </span>
              </div>
              {confirmingArchiveId === member.id ? (
                <div className="classroom-archive-confirmation">
                  <span>封存後不能再派新任務。</span>
                  <button
                    aria-label={`確認封存${member.alias}`}
                    className="text-button danger-text-button"
                    disabled={archivingId === member.id}
                    onClick={() => void archiveMember(member.id)}
                    type="button"
                  >
                    {archivingId === member.id ? "封存中…" : "確認封存"}
                  </button>
                  <button
                    className="text-button"
                    disabled={archivingId === member.id}
                    onClick={() => setConfirmingArchiveId(null)}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  aria-label={`封存${member.alias}`}
                  className="icon-text-button"
                  onClick={() => setConfirmingArchiveId(member.id)}
                  type="button"
                >
                  <Archive aria-hidden="true" />封存
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-help">尚未建立匿名名單；全班任務仍可使用。</p>
      )}

      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
