"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BattleSession } from "@/components/battle/BattleSession";
import { AppShell } from "@/components/layout/AppShell";
import { DiagnosticEmptyState, DiagnosticIntro } from "./DiagnosticIntro";
import { playableQuestionBank } from "@/content/playable";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { createDiagnosticSession } from "@/features/adventure/session-factory";

export default function DiagnosticPage() {
  const router = useRouter();
  const { ready, progress, dispatch } = useAdventure();
  const profile = progress.profile;
  const session = progress.activeSession;
  const contentAvailable = profile
    ? createDiagnosticSession(profile.grade, playableQuestionBank, "content-check") !== null
    : true;

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace("/start");
      return;
    }
    if (session?.kind === "diagnostic") return;

    const created = createDiagnosticSession(profile.grade, playableQuestionBank, crypto.randomUUID());
    if (!created) return;
    dispatch({ type: "start_session", session: created });
  }, [dispatch, profile, ready, router, session?.kind]);

  return (
    <AppShell pageClassName="diagnostic-page">
      <main id="main-content" className="page-main battle-main" tabIndex={-1}>
        <DiagnosticIntro />

        {!contentAvailable ? (
          <DiagnosticEmptyState />
        ) : (
          <BattleSession
            bank={playableQuestionBank}
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
