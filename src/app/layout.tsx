import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdventureProvider } from "@/features/adventure/AdventureProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "英語英雄島",
  description: "國小三至六年級英語學習扶助遊戲化自學系統",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c678a",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant-TW" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主要內容
        </a>
        <AdventureProvider>{children}</AdventureProvider>
        {/* 訪客計數：visitor-badge 徽章 + GoatCounter 統計（CSP 白名單見 infrastructure/security） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://visitor-badge.laobi.icu/badge?page_id=hk6429.english-hero-island"
          alt="訪客人數"
          loading="lazy"
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            zIndex: 2147483000,
            borderRadius: 999,
            boxShadow: "0 2px 10px rgba(0,0,0,.35)",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: "window.goatcounter = {path: p => location.host + p}",
          }}
        />
        <script
          data-goatcounter="https://hk6429.goatcounter.com/count"
          async
          src="https://gc.zgo.at/count.js"
        />
      </body>
    </html>
  );
}
