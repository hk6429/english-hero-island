"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BarChart3, Lightbulb, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deriveActivityLearningReport,
  type ActivityLearningEvidence,
  type ActivityLearningReport,
} from "@/domain/classroom/derive-activity-learning-report";
import { getActivityLearningEvidenceWithSupabase } from "@/infrastructure/supabase/classroom-gateway";

type Props = Readonly<{
  client: SupabaseClient;
  activityId: string;
}>;

const verdictLabels: Readonly<
  Record<ActivityLearningReport["verdict"], string>
> = {
  data_insufficient: "資料不足，暫不判定共通弱點",
  common_weakness: "可能的共通卡點",
  developing: "整體仍在發展中",
  secure: "目前證據顯示表現穩定",
};

export function TeacherActivityLearningReport({ client, activityId }: Props) {
  const [evidence, setEvidence] = useState<ActivityLearningEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getActivityLearningEvidenceWithSupabase(client, activityId)
      .then((loadedEvidence) => {
        if (!mounted) return;
        setEvidence(loadedEvidence);
        setError(null);
      })
      .catch((cause) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "課後報告載入失敗。");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activityId, client]);

  if (loading) {
    return <p className="loading-state">正在整理匿名課後證據…</p>;
  }

  if (error || !evidence) {
    return (
      <p className="inline-form-alert" role="alert">
        {error ?? "這場活動目前沒有可判讀的課後證據。"}
      </p>
    );
  }

  const report = deriveActivityLearningReport(evidence);
  const isInsufficient = report.verdict === "data_insufficient";

  return (
    <section className="activity-learning-report" aria-labelledby="activity-report-title">
      <header className="activity-report-heading">
        <div>
          <p className="eyebrow">匿名彙總・不排名</p>
          <h2 id="activity-report-title">課後學習證據</h2>
          <p>
            {evidence.title}・{report.microSkillLabel}・回應學生 {evidence.respondingParticipantCount}／
            {evidence.participantCount} 位
          </p>
        </div>
        <BarChart3 aria-hidden="true" />
      </header>

      <div className="activity-report-metrics" role="group" aria-label="課後學習證據摘要">
        <strong>作答覆蓋 {report.metrics.responseCoveragePercent}%</strong>
        <strong>獨立答對 {report.metrics.independentCorrectPercent}%</strong>
        <strong>需要支援 {report.metrics.pendingSupportPercent}%</strong>
      </div>

      <section
        className={`activity-report-verdict verdict-${report.verdict}`}
        aria-labelledby="activity-verdict-title"
      >
        <span aria-hidden="true">
          {isInsufficient ? <TriangleAlert /> : <ShieldCheck />}
        </span>
        <div>
          <h3 id="activity-verdict-title">{verdictLabels[report.verdict]}</h3>
          <ul>
            {report.evidenceReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      </section>

      {report.commonWeaknesses.length > 0 ? (
        <section className="common-weakness-list" aria-labelledby="weakness-list-title">
          <h3 id="weakness-list-title">先看支援比例較高的題目</h3>
          <ul>
            {report.commonWeaknesses.map((weakness) => (
              <li key={weakness.position}>
                第 {weakness.position} 題：{weakness.pendingSupportCount}／
                {weakness.responseCount} 份需要支援（{weakness.pendingSupportPercent}%）
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="activity-remediation" aria-labelledby="remediation-title">
        <span aria-hidden="true">
          <Lightbulb />
        </span>
        <div>
          <p className="eyebrow">下一步建議</p>
          <h3 id="remediation-title">{report.recommendation.title}</h3>
          <ol>
            {report.recommendation.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="activity-follow-up">{report.recommendation.followUp}</p>
        </div>
      </section>

      <p className="activity-report-guardrail">
        判讀門檻：活動已結束、至少 5 位參與者、六成完成全部題目，且每題至少 3 份作答。這是教學決策提示，不是學生能力診斷證明。
      </p>
    </section>
  );
}
