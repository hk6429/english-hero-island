"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BattleSession } from "@/components/battle/BattleSession";
import { AppShell } from "@/components/layout/AppShell";
import { pilotQuestionBank } from "@/content/pilot";
import { useAdventure } from "@/features/adventure/AdventureProvider";

export default function BattlePage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const session = progress.activeSession;

  useEffect(() => {
    if (!ready) return;
    if (!progress.profile) {
      router.replace("/start");
    } else if (!session) {
      router.replace("/island");
    }
  }, [progress.profile, ready, router, session]);

  return (
    <AppShell pageClassName="battle-page">
      <main id="main-content" className="page-main battle-main">
        <BattleSession
          bank={pilotQuestionBank}
          onComplete={() => {
            const wasDiagnostic = session?.kind === "diagnostic";
            dispatch({ type: "complete_session" });
            router.push(wasDiagnostic ? "/island" : "/result");
          }}
        />
      </main>
    </AppShell>
  );
}
