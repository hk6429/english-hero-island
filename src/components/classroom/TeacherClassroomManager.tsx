"use client";

import { Archive, School } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { SupportedGrade } from "@/domain/classroom/create-classroom";
import type { TeacherClassroomOption } from "./TeacherQuickActivityForm";

type Props = Readonly<{
  classrooms: ReadonlyArray<TeacherClassroomOption>;
  onCreate: (request: {
    title: string;
    grade: SupportedGrade;
  }) => Promise<TeacherClassroomOption>;
  onArchive: (classroomId: string) => Promise<unknown>;
  onChanged?: () => void;
}>;

export function TeacherClassroomManager({
  classrooms,
  onCreate,
  onArchive,
  onChanged,
}: Props) {
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState<SupportedGrade>(3);
  const [submitting, setSubmitting] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const classroom = await onCreate({ title: title.trim(), grade });
      setTitle("");
      setMessage(`${classroom.title}已建立`);
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "班級建立失敗。");
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveClassroom(classroom: TeacherClassroomOption) {
    setArchivingId(classroom.id);
    setMessage(null);
    setError(null);
    try {
      await onArchive(classroom.id);
      setArchiveTargetId(null);
      setMessage(`${classroom.title}已封存`);
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "班級封存失敗。");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <section className="classroom-manager" aria-labelledby="classroom-manager-title">
      <div className="classroom-form-heading">
        <div>
          <p className="eyebrow">班級管理</p>
          <h2 id="classroom-manager-title">先建立班級，再派安全任務</h2>
          <p>班級只記錄教師設定的名稱與年級；學生仍以匿名身分加入。</p>
        </div>
        <School aria-hidden="true" />
      </div>

      <form className="classroom-manager-form" onSubmit={createClassroom}>
        <label className="classroom-field">
          <span>新班級名稱</span>
          <input
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            required
            type="text"
            value={title}
          />
        </label>
        <label className="classroom-field">
          <span>新班級年級</span>
          <select
            onChange={(event) => setGrade(Number(event.target.value) as SupportedGrade)}
            value={grade}
          >
            {[3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value} 年級
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" disabled={submitting} type="submit">
          {submitting ? "正在建立…" : "建立班級"}
        </button>
      </form>

      {classrooms.length > 0 ? (
        <ul className="classroom-manager-list" aria-label="目前班級">
          {classrooms.map((classroom) => (
            <li key={classroom.id}>
              <div>
                <strong>{classroom.title}</strong>
                <span>{classroom.grade} 年級</span>
              </div>
              {archiveTargetId === classroom.id ? (
                <div className="classroom-archive-confirmation">
                  <span>封存後不再出現在派題清單。</span>
                  <button
                    className="text-button danger-text-button"
                    disabled={archivingId === classroom.id}
                    onClick={() => void archiveClassroom(classroom)}
                    type="button"
                  >
                    {archivingId === classroom.id
                      ? "正在封存…"
                      : `確認封存${classroom.title}`}
                  </button>
                  <button
                    className="text-button"
                    disabled={archivingId === classroom.id}
                    onClick={() => setArchiveTargetId(null)}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  aria-label={`封存${classroom.title}`}
                  className="icon-text-button"
                  onClick={() => setArchiveTargetId(classroom.id)}
                  type="button"
                >
                  <Archive aria-hidden="true" />封存
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-help">目前還沒有班級，建立第一個班級後即可載入複核題。</p>
      )}

      {message ? <p className="login-success" role="status">{message}</p> : null}
      {error ? <p className="inline-form-alert" role="alert">{error}</p> : null}
    </section>
  );
}
