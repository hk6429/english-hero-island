"use client";

import Link from "next/link";
import { Compass, FlaskConical, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useAdventure } from "@/features/adventure/AdventureProvider";

export function AppShell({
  children,
  pageClassName = "",
}: {
  children: ReactNode;
  pageClassName?: string;
}) {
  const { progress, persistenceError } = useAdventure();

  return (
    <div className={`app-shell ${pageClassName}`}>
      <div className="pilot-banner" role="status">
        <FlaskConical aria-hidden="true" size={20} />
        <span>試作內容：60 題原創草稿，待兩位英語教師複核，不作正式評量。</span>
      </div>
      <header className="site-header">
        <Link className="brand-link" href="/" aria-label="英語英雄島首頁">
          <span className="brand-mark" aria-hidden="true">
            <Compass size={25} />
          </span>
          <span>英語英雄島</span>
        </Link>
        {progress.profile ? (
          <div className="hero-status" aria-label="英雄狀態">
            <span>{progress.profile.grade} 年級</span>
            <strong>{progress.profile.nickname}</strong>
            <span className="xp-chip">
              <Sparkles aria-hidden="true" size={17} />
              {progress.xp} XP
            </span>
          </div>
        ) : null}
      </header>
      {persistenceError ? (
        <p className="inline-alert" role="alert">
          {persistenceError}
        </p>
      ) : null}
      {children}
    </div>
  );
}
