import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

// playwright.config.ts 會把 NEXT_PUBLIC_SUPABASE_URL 預設為本機 Supabase 位址，
// 這裡驗證 CSP 真的允許瀏覽器連到該位址（connected browser test），
// 而不是只檢查「未設定 Supabase 時的安全閘門」。
const SUPABASE_ORIGIN =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_PORT = Number(new URL(SUPABASE_ORIGIN).port || 80);
const BLOCKED_ORIGIN = "http://127.0.0.1:54329";
const BLOCKED_PORT = 54329;

test.describe("Supabase CSP 放行", () => {
  // 只在 chromium project 執行（mobile-360 以 playwright.config.ts 的
  // testIgnore 排除），避免兩個 worker 搶同一組 stub 埠號。
  let supabaseStub: Server;
  let outsiderStub: Server;

  test.beforeAll(async () => {
    const handler = (
      _request: import("node:http").IncomingMessage,
      response: import("node:http").ServerResponse,
    ) => {
      response.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      });
      response.end(JSON.stringify({ ok: true }));
    };
    supabaseStub = createServer(handler);
    outsiderStub = createServer(handler);
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        supabaseStub.once("error", reject);
        supabaseStub.listen(SUPABASE_PORT, "127.0.0.1", resolve);
      }),
      new Promise<void>((resolve, reject) => {
        outsiderStub.once("error", reject);
        outsiderStub.listen(BLOCKED_PORT, "127.0.0.1", resolve);
      }),
    ]);
  });

  test.afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => supabaseStub?.close(() => resolve())),
      new Promise<void>((resolve) => outsiderStub?.close(() => resolve())),
    ]);
  });

  test("CSP header 只允許設定的 Supabase origin，不是萬用放行", async ({
    page,
  }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"] ?? "";
    const supabaseUrl = new URL(SUPABASE_ORIGIN);
    const wsOrigin = supabaseUrl.origin.replace(/^http/, "ws");

    expect(csp).toContain(`connect-src 'self' ${supabaseUrl.origin} ${wsOrigin}`);
    expect(csp).not.toContain("connect-src *");
    expect(csp).not.toContain(BLOCKED_ORIGIN);
  });

  test("瀏覽器可實際 fetch 設定的 Supabase origin，其他 origin 仍被 CSP 擋下", async ({
    page,
  }) => {
    await page.goto("/");

    const allowed = await page.evaluate(async (origin) => {
      const response = await fetch(`${origin}/rest/v1/`);
      return (await response.json()) as { ok: boolean };
    }, SUPABASE_ORIGIN);
    expect(allowed.ok).toBe(true);

    const blockedOutcome = await page.evaluate(async (origin) => {
      try {
        await fetch(`${origin}/rest/v1/`);
        return "reached";
      } catch {
        return "blocked";
      }
    }, BLOCKED_ORIGIN);
    expect(blockedOutcome).toBe("blocked");
  });
});
