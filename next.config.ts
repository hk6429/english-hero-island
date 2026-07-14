import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/infrastructure/security/content-security-policy";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(process.env),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// 三平台部署：Cloudflare Pages／Netlify 走靜態匯出（STATIC_EXPORT=1）。
// 全站均為 ○ Static，可安全 export；安全標頭改由輸出根的 _headers 檔提供。
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: process.cwd() },
  ...(staticExport
    ? { output: "export" as const, images: { unoptimized: true }, trailingSlash: true }
    : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
