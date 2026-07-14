"use client";

import { ArrowRight, Check, Circle, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { playableQuestionBank } from "@/content/playable";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import {
  FOCUS_MICRO_SKILL,
  HINT_TOOLS,
  MISSION_ROUTES,
  MISSION_COPY,
  microSkillLabel,
} from "@/features/adventure/content-map";
import { createMissionSession } from "@/features/adventure/session-factory";
import { MissionRadioGroup } from "./MissionRadioGroup";
import styles from "./mission.module.css";

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
        playableQuestionBank,
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
    const created = createMissionSession(profile.grade, focus, playableQuestionBank, crypto.randomUUID());
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
        <main id="main-content" className="page-main" tabIndex={-1}>
          <p className="loading-state">正在載入任務卷軸……</p>
        </main>
      </AppShell>
    );
  }

  const mission = MISSION_COPY[profile.grade];
  const focus = FOCUS_MICRO_SKILL[profile.grade];

  return (
    <AppShell pageClassName="mission-page">
      <main id="main-content" className="page-main narrow-main" tabIndex={-1}>
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
            <section className="route-section" aria-labelledby="route-title">
              <div className="section-heading">
                <p className={`eyebrow ${styles.stepEyebrow}`}>
                  <span className={styles.stepBadge} aria-hidden="true">
                    1
                  </span>
                  第 1 步・自主路線
                </p>
                <h2 id="route-title">同一份能力，想怎麼走？</h2>
                <p>兩條路使用相同題目、提示與 XP 規則，只改變你看見的探索方式。</p>
              </div>
              <MissionRadioGroup
                className="route-grid"
                ariaLabel="練功路線"
                options={MISSION_ROUTES}
                selectedId={session?.selectedRoute}
                onSelect={(route) => dispatch({ type: "choose_route", route })}
                optionClassName={(_, selected) =>
                  `route-card ${styles.routeCard} ${selected ? "selected" : ""}`
                }
                renderOption={(route, selected) => (
                  <>
                    <MapPinned aria-hidden="true" />
                    <span>
                      <strong>{route.name}</strong>
                      <small>{route.description}</small>
                      <em>{route.effect}</em>
                    </span>
                    {selected ? (
                      <span className={styles.routeSelectedMark}>
                        <Check aria-hidden="true" />
                        已選這條路
                      </span>
                    ) : null}
                  </>
                )}
              />
            </section>

            <section className="tool-section" aria-labelledby="tool-title">
              <div className="section-heading">
                <p className={`eyebrow ${styles.stepEyebrow}`}>
                  <span className={styles.stepBadge} aria-hidden="true">
                    2
                  </span>
                  第 2 步・策略選擇
                </p>
                <h2 id="tool-title">這次想帶哪一個提示工具？</h2>
                <p>工具不是作弊；知道何時求助，也是一種學習能力。</p>
              </div>
              <MissionRadioGroup
                className="tool-grid"
                ariaLabel="提示工具"
                options={HINT_TOOLS}
                selectedId={session?.selectedTool}
                onSelect={(tool) => dispatch({ type: "choose_tool", tool })}
                optionClassName={(_, selected) =>
                  `tool-card ${selected ? "selected" : ""}`
                }
                renderOption={(tool, selected) => (
                  <>
                    <span className="tool-icon" aria-hidden="true">
                      {selected ? <Check /> : <Sparkles />}
                    </span>
                    <strong>{tool.name}</strong>
                    <span>{tool.description}</span>
                  </>
                )}
              />
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

            <ul className={styles.prepChecklist} aria-label="出發前檢查">
              <li className={session?.selectedRoute ? styles.prepDone : undefined}>
                {session?.selectedRoute ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                路線：
                {MISSION_ROUTES.find((route) => route.id === session?.selectedRoute)?.name ??
                  "等你挑選"}
              </li>
              <li className={session?.selectedTool ? styles.prepDone : undefined}>
                {session?.selectedTool ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
                工具：
                {HINT_TOOLS.find((tool) => tool.id === session?.selectedTool)?.name ?? "等你挑選"}
              </li>
            </ul>

            <button
              className="primary-button wide-action"
              type="button"
              disabled={!session?.selectedTool || !session?.selectedRoute}
              onClick={() => {
                dispatch({ type: "begin_battle" });
                router.push("/battle");
              }}
            >
              {!session?.selectedRoute
                ? "先選一條練功路線"
                : session.selectedTool
                  ? "開始練功"
                  : "再選一個提示工具"}
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        )}
      </main>
    </AppShell>
  );
}
