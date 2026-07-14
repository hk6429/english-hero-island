import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      // 只設定 URL、不給金鑰：app 仍視為未連線（安全閘門測試不受影響），
      // 但 CSP 會放行本機 Supabase origin，讓 supabase-csp.spec.ts 能驗證連線。
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-360",
      // supabase-csp 的 stub server 綁固定埠號，只在 chromium project 跑一次。
      testIgnore: /supabase-csp\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 800 },
      },
    },
  ],
});
