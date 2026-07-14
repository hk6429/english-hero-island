"use client";

import { Clock3, ShieldCheck, UsersRound } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { generateJoinCode } from "@/domain/classroom/generate-join-code";
import { validateActivityTargets } from "@/domain/classroom/validate-activity-targets";
import type { ClassroomMember } from "@/infrastructure/supabase/classroom-gateway";
import styles from "./TeacherPolish.module.css";

export type TeacherClassroomOption = Readonly<{
  id: string;
  title: string;
  grade: 3 | 4 | 5 | 6;
}>;

export type ClassroomMicroSkillOption = Readonly<{
  id: string;
  label: string;
  availableQuestions: number;
}>;

export type QuickActivityRequest = Readonly<{
  classroomId: string;
  title: string;
  microSkill: string;
  questionCount: 3 | 5;
  audience: "whole_class" | "small_group" | "individual";
  joinCode: string;
  targetMemberIds: ReadonlyArray<string>;
}>;

export type CreatedQuickActivity = Readonly<{
  activityId: string;
  joinCode: string;
  joinClosesAt: string;
  activityStatus: "waiting";
}>;

type Props = Readonly<{
  classrooms: ReadonlyArray<TeacherClassroomOption>;
  microSkills: ReadonlyArray<ClassroomMicroSkillOption>;
  members?: ReadonlyArray<ClassroomMember>;
  onCreate: (request: QuickActivityRequest) => Promise<CreatedQuickActivity>;
  onClassroomChange?: (classroomId: string) => void;
  onCreated?: (activity: CreatedQuickActivity) => void;
  generateCode?: () => string;
}>;

export function TeacherQuickActivityForm({
  classrooms,
  microSkills,
  members = [],
  onCreate,
  onClassroomChange,
  onCreated,
  generateCode = generateJoinCode,
}: Props) {
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const [title, setTitle] = useState("今日英語救援任務");
  const [microSkill, setMicroSkill] = useState(microSkills[0]?.id ?? "");
  const [questionCount, setQuestionCount] = useState<3 | 5>(3);
  const [audience, setAudience] = useState<QuickActivityRequest["audience"]>(
    "whole_class",
  );
  const [targetMemberIds, setTargetMemberIds] = useState<ReadonlyArray<string>>([]);
  const [created, setCreated] = useState<CreatedQuickActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeMicroSkill = useMemo(
    () =>
      microSkills.some((option) => option.id === microSkill)
        ? microSkill
        : (microSkills[0]?.id ?? ""),
    [microSkill, microSkills],
  );
  const selectedMicroSkill = useMemo(
    () => microSkills.find((option) => option.id === activeMicroSkill),
    [activeMicroSkill, microSkills],
  );
  const targetValidation = useMemo(
    () => validateActivityTargets(audience, targetMemberIds),
    [audience, targetMemberIds],
  );

  const canSubmit =
    Boolean(classroomId && title.trim() && activeMicroSkill) &&
    (selectedMicroSkill?.availableQuestions ?? 0) >= questionCount &&
    targetValidation.ok &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setCreated(null);
    setError(null);

    try {
      const result = await onCreate({
        classroomId,
        title: title.trim(),
        microSkill: activeMicroSkill,
        questionCount,
        audience,
        joinCode: generateCode(),
        targetMemberIds: targetValidation.ok ? targetValidation.targetIds : [],
      });
      setCreated(result);
      onCreated?.(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "活動建立失敗，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="classroom-form" onSubmit={handleSubmit}>
      <div className="classroom-form-heading">
        <div>
          <p className="eyebrow">教師快派</p>
          <h2>兩分鐘建立一場小任務</h2>
          <p>選班級、能力與題數即可。學生只需六碼與匿名暱稱。</p>
        </div>
        <span className="classroom-time-chip">
          <Clock3 aria-hidden="true" size={18} />約 2 分鐘
        </span>
      </div>

      <p className={styles.stepLabel}>
        <span aria-hidden="true" className={styles.stepNum}>
          1
        </span>
        選班級與能力
      </p>

      <div className={`classroom-field-grid ${styles.fieldGrid}`}>
        <label className="classroom-field">
          <span>班級</span>
          <select
            value={classroomId}
            onChange={(event) => {
              const nextClassroomId = event.target.value;
              setClassroomId(nextClassroomId);
              setCreated(null);
              setAudience("whole_class");
              setTargetMemberIds([]);
              onClassroomChange?.(nextClassroomId);
            }}
            required
          >
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.title}・{classroom.grade} 年級
              </option>
            ))}
          </select>
        </label>

        <label className="classroom-field">
          <span>活動名稱</span>
          <input
            maxLength={80}
            required
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="classroom-field classroom-field-wide">
          <span>這次要練的能力</span>
          <select
            value={activeMicroSkill}
            onChange={(event) => setMicroSkill(event.target.value)}
            required
          >
            {microSkills.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}（可用 {option.availableQuestions} 題）
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.stepLabel}>
        <span aria-hidden="true" className={styles.stepNum}>
          2
        </span>
        題數與派給誰
      </p>

      <div className={`classroom-choice-grid ${styles.fieldGrid}`}>
        <fieldset className="classroom-choice-group">
          <legend>題數</legend>
          <label>
            <input
              checked={questionCount === 3}
              name="question-count"
              onChange={() => setQuestionCount(3)}
              type="radio"
            />
            <span>3 題（約 3 分鐘）</span>
          </label>
          <label>
            <input
              checked={questionCount === 5}
              name="question-count"
              onChange={() => setQuestionCount(5)}
              type="radio"
            />
            <span>5 題（約 5 分鐘）</span>
          </label>
        </fieldset>

        <label className="classroom-field">
          <span>派給誰</span>
          <select
            value={audience}
            onChange={(event) => {
              setAudience(event.target.value as QuickActivityRequest["audience"]);
              setTargetMemberIds([]);
            }}
          >
            <option value="whole_class">全班</option>
            <option disabled={members.length < 2} value="small_group">
              小組
            </option>
            <option disabled={members.length < 1} value="individual">
              個別學生
            </option>
          </select>
        </label>
      </div>

      {audience !== "whole_class" ? (
        <fieldset className="activity-target-picker">
          <legend>{audience === "small_group" ? "選擇小組成員" : "選擇一位學生"}</legend>
          <p>只使用匿名別名與學習代碼，不要輸入學生真實姓名。</p>
          <div className="activity-target-options">
            {members.map((member) => {
              const checked = targetMemberIds.includes(member.id);
              return (
                <label key={member.id}>
                  <input
                    checked={checked}
                    name={audience === "individual" ? "target-member" : undefined}
                    onChange={() => {
                      if (audience === "individual") {
                        setTargetMemberIds([member.id]);
                        return;
                      }
                      setTargetMemberIds(
                        checked
                          ? targetMemberIds.filter((targetId) => targetId !== member.id)
                          : [...targetMemberIds, member.id],
                      );
                    }}
                    type={audience === "individual" ? "radio" : "checkbox"}
                  />
                  <span>
                    <strong>{member.alias}</strong>
                    <small>
                      代碼 {member.code}
                      {member.groupLabel ? `・${member.groupLabel}` : ""}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {!targetValidation.ok && audience !== "whole_class" ? (
        <p className="field-error" role="alert">
          {audience === "small_group"
            ? "小組任務至少要選 2 位匿名學生。"
            : "個別任務必須選 1 位匿名學生。"}
        </p>
      ) : null}

      {selectedMicroSkill && selectedMicroSkill.availableQuestions < questionCount ? (
        <p className="field-error" role="alert">
          這個能力目前沒有足夠的雙人複核題，請減少題數或更換能力。
        </p>
      ) : null}

      <p className={styles.stepLabel}>
        <span aria-hidden="true" className={styles.stepNum}>
          3
        </span>
        確認並建立
      </p>

      <div className="classroom-privacy-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          即時看板只顯示已加入、進行中、已完成與可能需要協助；不公開個人成績、速度或排名。
        </p>
      </div>

      <button className="primary-button" disabled={!canSubmit} type="submit">
        <UsersRound aria-hidden="true" />
        {submitting ? "正在建立…" : "建立課堂任務"}
      </button>

      {!canSubmit && !submitting ? (
        <p className={styles.submitHint}>選好班級、能力與對象後，就能建立任務。</p>
      ) : null}

      {error ? (
        <p className="inline-form-alert" role="alert">
          {error}
        </p>
      ) : null}

      {created ? (
        <section className="join-code-card" aria-live="polite">
          <p>活動已建立，請學生輸入</p>
          <strong className={styles.joinCode}>{created.joinCode}</strong>
          <small>代碼有效 24 小時；教師啟動後才會顯示題目。</small>
        </section>
      ) : null}
    </form>
  );
}
