"use client";

import { Compass, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BattleSession } from "@/components/battle/BattleSession";
import { AppShell } from "@/components/layout/AppShell";
import { pilotQuestionBank } from "@/content/pilot";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { createDiagnosticSession } from "@/features/adventure/session-factory";

export default function DiagnosticPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const profile = progress.profile;
  const session = progress.activeSession;
  const contentAvailable = profile
    ? createDiagnosticSession(profile.grade, pilotQuestionBank, "content-check") !== null
    : true;

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (session?.kind === "diagnostic") return;

    const created = createDiagnosticSession(profile.grade, pilotQuestionBank, crypto.randomUUID());
    if (!created) return;
    dispatch({ type: "start_session", session: created });
  }, [dispatch, profile, ready, router, session?.kind]);

  return (
    <AppShell pageClassName="diagnostic-page">
      <main id="main-content" className="page-main battle-main">
        <div className="journey-intro compact-intro">
          <span className="intro-icon" aria-hidden="true">
            <Compass />
          </span>
          <div>
            <p className="eyebrow">起點偵測</p>
            <h1>五題就好，先看看哪條路最適合你。</h1>
            <p>
              <Shield aria-hidden="true" /> 答錯會出現線索，不會扣掉已完成的進度。
            </p>
          </div>
        </div>

        {!contentAvailable ? (
          <div className="empty-state" role="alert">
            <h2>診斷戰還沒準備好</h2>
            <p>這個年級的診斷題暫時不足，進度沒有被改動。</p>
          </div>
        ) : (
          <BattleSession
            bank={pilotQuestionBank}
            onComplete={() => {
              dispatch({ type: "complete_session" });
              router.push("/island");
            }}
          />
        )}
      </main>
    </AppShell>
  );
}
