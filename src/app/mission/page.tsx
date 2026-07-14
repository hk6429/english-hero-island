"use client";

import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { pilotQuestionBank } from "@/content/pilot";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import {
  FOCUS_MICRO_SKILL,
  HINT_TOOLS,
  MISSION_COPY,
  microSkillLabel,
} from "@/features/adventure/content-map";
import { createMissionSession } from "@/features/adventure/session-factory";

export default function MissionPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const [contractAccepted, setContractAccepted] = useState(false);
  const profile = progress.profile;
  const session = progress.activeSession;
  const contentAvailable = profile
    ? createMissionSession(
        profile.grade,
        FOCUS_MICRO_SKILL[profile.grade],
        pilotQuestionBank,
        "content-check",
      ) !== null
    : true;

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (
      session?.kind === "mission" &&
      session.currentIndex < session.questionIds.length
    ) {
      return;
    }

    const focus = FOCUS_MICRO_SKILL[profile.grade];
    const created = createMissionSession(profile.grade, focus, pilotQuestionBank, crypto.randomUUID());
    if (!created) return;
    dispatch({ type: "start_session", session: created });
  }, [
    dispatch,
    profile,
    ready,
    router,
    session?.currentIndex,
    session?.kind,
    session?.questionIds.length,
  ]);

  if (!ready || !profile) {
    return (
      <AppShell>
        <main id="main-content" className="page-main">
          <p className="loading-state">正在載入任務卷軸……</p>
        </main>
      </AppShell>
    );
  }

  const mission = MISSION_COPY[profile.grade];
  const focus = FOCUS_MICRO_SKILL[profile.grade];

  return (
    <AppShell pageClassName="mission-page">
      <main id="main-content" className="page-main narrow-main">
        <section className="mission-brief" aria-labelledby="brief-title">
          <p className="eyebrow">{mission.place}・任務準備</p>
          <h1 id="brief-title">{mission.title}</h1>
          <p>{mission.story}</p>
          <div className="mission-facts">
            <span>聚焦：{microSkillLabel(focus)}</span>
            <span>6 回合</span>
            <span>約 3–5 分鐘</span>
          </div>
        </section>

        {!contentAvailable ? (
          <div className="empty-state" role="alert">
            <h2>任務暫時無法開啟</h2>
            <p>這條任務的練功題或 Boss 題暫時不足。</p>
          </div>
        ) : (
          <>
            <section className="tool-section" aria-labelledby="tool-title">
              <div className="section-heading">
                <p className="eyebrow">策略選擇</p>
                <h2 id="tool-title">這次想帶哪一個提示工具？</h2>
                <p>工具不是作弊；知道何時求助，也是一種學習能力。</p>
              </div>
              <div className="tool-grid" role="radiogroup" aria-label="提示工具">
                {HINT_TOOLS.map((tool) => {
                  const selected = session?.selectedTool === tool.id;
                  return (
                    <button
                      className={`tool-card ${selected ? "selected" : ""}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      key={tool.id}
                      onClick={() => dispatch({ type: "choose_tool", tool: tool.id })}
                    >
                      <span className="tool-icon" aria-hidden="true">
                        {selected ? <Check /> : <Sparkles />}
                      </span>
                      <strong>{tool.name}</strong>
                      <span>{tool.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <label className={`hero-contract ${contractAccepted ? "accepted" : ""}`}>
              <input
                type="checkbox"
                checked={contractAccepted}
                onChange={(event) => setContractAccepted(event.target.checked)}
              />
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>英雄約定（可選）</strong>
                我先自己想 10 秒，需要時再使用工具；答錯也會完成救援。
              </span>
            </label>

            <button
              className="primary-button wide-action"
              type="button"
              disabled={!session?.selectedTool}
              onClick={() => {
                dispatch({ type: "begin_battle" });
                router.push("/battle");
              }}
            >
              {session?.selectedTool ? "開始練功" : "先選一個提示工具"}
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}
      </main>
    </AppShell>
  );
}
