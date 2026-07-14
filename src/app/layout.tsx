import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "英語英雄島",
  description: "國小三至六年級英語學習扶助遊戲化自學系統",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主要內容
        </a>
        {children}
      </body>
    </html>
  );
}
