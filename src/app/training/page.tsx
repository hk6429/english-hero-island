"use client";

import { ArrowRight, CalendarClock, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pilotQuestionBank } from "@/content/pilot";
import { scheduleReview } from "@/domain/mastery/schedule-review";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { FOCUS_MICRO_SKILL, microSkillLabel } from "@/features/adventure/content-map";
import { createReviewSession } from "@/features/adventure/session-factory";

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

export default function TrainingPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const [error, setError] = useState("");
  const profile = progress.profile;
  const focus = profile
    ? progress.activeSession?.microSkill ?? FOCUS_MICRO_SKILL[profile.grade]
    : null;
  const review = useMemo(
    () => (focus ? scheduleReview(focus, progress.events) : null),
    [focus, progress.events],
  );

  useEffect(() => {
    if (ready && !profile) router.replace("/start");
  }, [profile, ready, router]);

  if (!ready || !profile || !focus) {
    return (
      <AppShell>
        <main id="main-content" className="page-main" tabIndex={-1}>
          <p className="loading-state">正在整理修煉日程……</p>
        </main>
      </AppShell>
    );
  }

  function startReviewPreview() {
    const seenEvents = progress.events.filter((event) => event.microSkill === focus);
    const session = createReviewSession(
      profile!.grade,
      focus!,
      pilotQuestionBank,
      crypto.randomUUID(),
      seenEvents.map((event) => event.questionId),
      seenEvents.map((event) => event.variantGroup),
    );

    if (!session) {
      setError("可用的不同表面修煉題已用完；正式題庫擴充後會自動補上。");
      return;
    }

    dispatch({ type: "start_session", session });
    dispatch({ type: "begin_battle" });
    router.push("/battle");
  }

  return (
    <AppShell pageClassName="training-page">
      <main id="main-content" className="page-main narrow-main" tabIndex={-1}>
        <section className="training-hero">
          <span className="calendar-glyph" aria-hidden="true">
            <CalendarClock />
          </span>
          <div>
            <p className="eyebrow">修煉佇列</p>
            <h1>休息一下，換一天、換一種題目再確認。</h1>
            <p>同一天重複背答案不算精熟；隔天還能自己完成，才是真的帶得走。</p>
          </div>
        </section>

        <section className="review-card" aria-labelledby="review-title">
          <div className="review-date">
            <span>建議日期</span>
            <strong>{review ? displayDate(review.dueDate) : "完成第一場任務後排程"}</strong>
          </div>
          <div>
            <p className="eyebrow">{review?.priority === "support" ? "救援回流" : "跨日確認"}</p>
            <h2 id="review-title">{microSkillLabel(focus)}</h2>
            <p>{review?.reason ?? "目前還沒有足夠的作答證據。"}</p>
          </div>
          <span className="review-badge">新表面題</span>
        </section>

        <div className="integrity-note">
          <ShieldCheck aria-hidden="true" />
          <p>
            <strong>精熟規則：</strong>兩個不同日期、兩種不同表面題都首次獨立答對。今天先試跑仍會保留紀錄，但不會冒充跨日精熟。
          </p>
        </div>

        {error ? <p className="inline-alert" role="alert">{error}</p> : null}

        <div className="training-actions">
          <button className="primary-button" type="button" onClick={startReviewPreview}>
            <RotateCcw aria-hidden="true" />
            先試跑一題變式題
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              dispatch({ type: "return_to_island" });
              router.push("/island");
            }}
          >
            回能力島
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </main>
    </AppShell>
  );
}
