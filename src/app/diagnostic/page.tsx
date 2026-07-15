"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BattleSession } from "@/components/battle/BattleSession";
import { AppShell } from "@/components/layout/AppShell";
import { DiagnosticEmptyState, DiagnosticIntro } from "./DiagnosticIntro";
import { DiagnosticReveal } from "./DiagnosticReveal";
import { DiagnosticWarmup } from "./DiagnosticWarmup";
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
  const [warmedUp, setWarmedUp] = useState(false);
  const [revealDone, setRevealDone] = useState(false);

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

  if (revealDone && profile) {
    return (
      <AppShell pageClassName="diagnostic-page">
        <main id="main-content" className="page-main battle-main" tabIndex={-1}>
          <DiagnosticReveal
            grade={profile.grade}
            onContinue={() => {
              dispatch({ type: "complete_session" });
              router.push("/island");
            }}
          />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell pageClassName="diagnostic-page">
      <main id="main-content" className="page-main battle-main" tabIndex={-1}>
        {!contentAvailable ? (
          <>
            <DiagnosticIntro />
            <DiagnosticEmptyState />
          </>
        ) : !warmedUp ? (
          <DiagnosticWarmup onReady={() => setWarmedUp(true)} />
        ) : (
          <>
            <DiagnosticIntro />
            <BattleSession
              bank={playableQuestionBank}
              onComplete={() => setRevealDone(true)}
            />
          </>
        )}
      </main>
    </AppShell>
  );
}
