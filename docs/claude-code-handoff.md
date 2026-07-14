# Claude Code 接手紀錄

日期：2026-07-14

## 一、產品與發布現況

- 學生端：三、四、五、六年級皆可完成建立英雄、診斷、能力島、練功、Boss、結果與跨日修煉。
- 課堂端：教師快派、匿名學生加入、合作 Boss、離線重送與匿名彙總報告已有程式垂直切片。
- 題庫治理：建立、批次匯入、修訂、送審、雙人複核、發布、爭議、退役、素材收據與確認介面已有程式與靜態契約。
- 題庫：200 題原創治理草稿；學生端仍固定使用原本 60 題試作內容。
- 正式素材：需要 24 份音訊與 25 份圖片，目前實體正式素材為 0／49；49 筆 intake 的 receipt 與權利欄位都保持空白。
- 遊戲化：Octalysis 程式證據複評 70／80，達到階段門檻，但尚未做三角色與兒童正式驗收。
- GitHub：https://github.com/hk6429/english-hero-island
- Vercel Preview：https://english-hero-island-p98aedc64-hk6429s-projects.vercel.app
- Preview 為 Vercel SSO 保護環境；production 部署數維持 0。

## 二、最後一次本機品質紀錄

2026-07-14 使用 Node.js 22.23.1 執行：

- `npm run lint`：通過。
- `npm run typecheck`：通過。
- `npm test`：82 個測試檔、389 個測試通過。
- `npm run test:a11y`：18／18 通過。
- `npm run test:e2e`：36／36 通過。
- `npm run build`：Next.js production build 通過。
- `npm run verify:db`：db reset＋28 個 pgTAP＋db lint 全數通過（2026-07-14 新增）。
- `npm run ingest:production-assets`：在缺少正式 manifest 時以退出碼 1 阻擋，且沒有留下 production bank、verification report 或 lock。

這些是本機執行紀錄，不是可追溯的 CI run。Repository 目前沒有 `.github/workflows`；建立版本化 CI 證據仍是 P1。

## 三、已完成的正式素材安全底層

- `scripts/production-assets/verify-production-asset-bundle.ts`
  - 實讀題庫、素材與權利文件 bytes。
  - 驗證 SHA-256、byte length、magic-byte MIME、題號、素材種類、placeholder、content-addressed locator 與權利組合。
  - 允許多題共用完全相同的 receipt，拒絕同 locator 綁定不同 byte receipt。
- `scripts/production-assets/write-verified-production-asset-bundle.ts`
  - 匯入鎖涵蓋 report 失效、讀檔、驗證、暫存寫入與 report 最後提交。
  - report 綁定實際輸出 production bank 的 SHA-256 與 byte length。
- `artifacts/teacher-prereview-pack/draft-3c9686dac6674cc4/production-assets.manifest.template.json`
  - 精確列出 49 個槽位：24 audio、25 image。
  - 空白欄位是 intake，不是完成證據。

magic bytes 只能辨識檔頭，不能證明瀏覽器可播放、可解碼、音訊時長或圖片尺寸合理。

## 四、下一階段 P0

### P0-1：CSP 阻擋正式 Supabase（2026-07-14 已完成）

已於 2026-07-14 解決：

- `src/infrastructure/security/content-security-policy.ts`：由 `NEXT_PUBLIC_SUPABASE_URL` 導出最小 `connect-src` allowlist（https origin＋對應 `wss://`；本機 `http://127.0.0.1|localhost` 加對應 `ws://`，並在此情況移除會強制升級的 `upgrade-insecure-requests`）。URL 缺漏、非本機 http、格式錯誤一律 fail-closed 回到 `'self'`。
- `next.config.ts` 改用 `buildContentSecurityPolicy(process.env)`。
- 單元測試 `content-security-policy.test.ts`（8 個）覆蓋雲端、本機、路徑剝除與 fail-closed 情境。
- Connected browser test：`e2e/supabase-csp.spec.ts` 以 stub server 佔住 `127.0.0.1:54321`，驗證瀏覽器可實際 fetch 設定的 Supabase origin、未設定的 origin 仍被 CSP 擋下、header 不含 `connect-src *`；`playwright.config.ts` webServer 只注入 URL（不含金鑰），既有「未設定 Supabase 安全閘門」E2E 行為不變。

以下保留原始問題敘述供追溯。

#### 原始敘述

`next.config.ts` 的 CSP 目前是 `connect-src 'self'`，但瀏覽器 client 需要連到：

- 雲端專用 Supabase 的 `https://<project>.supabase.co` 與 realtime `wss://...`。
- 本機 Supabase 的 `http://127.0.0.1:54321` 與對應 websocket。

現有 E2E 只測「未設定 Supabase 時的安全閘門」，所以沒有抓到這個問題。修正時應從環境設定產生最小 allowlist，不要把 `connect-src *` 當解法，並新增 connected browser test。

### P0-2：真實 PostgreSQL runtime 驗證（2026-07-14 第一階段完成）

2026-07-14 進度：

- Docker runtime 已復原（重灌 OrbStack cask；Docker 29.4.0）。
- `package.json` 已加入 `db:start` / `db:reset` / `test:db` / `lint:db` / `verify:db`（旗標同下方建議）。
- migration 首次在真實 PostgreSQL 17 上執行，抓到並修正 4 個 regex 測試無法發現的真實 bug：
  1. `get_student_activity_questions` 的 `returns table (position …)`：`position` 是保留字，整份 migration 根本套用不進去（SQLSTATE 42601）→ 改為 `"position"`。
  2. `list_question_versions` 宣告 `stable` 卻在 reviewer profile 查詢用 `for share`（0A000，執行必炸）→ 讀取函式不需要列鎖，移除 `for share`。
  3. `join_classroom_activity` 的 `on conflict (activity_id, …)` 與 returns table 輸出欄位 `activity_id` 撞名（42702 執行必炸）→ 加 `#variable_conflict use_column`（函式內所有查詢欄位均已限定，安全）。
  4. `private.validate_question_content` 呼叫不存在的 `jsonb_object_length()`（42883）→ 改為 `(select count(*) from jsonb_object_keys(…))`；同步更新原本把錯誤字串釘住的 Vitest 斷言。
- 第一批 pgTAP：`supabase/tests/database/`（28 個測試）——schema 煙霧（16 表／RLS 全開／32 個 security definer RPC）、anon/authenticated 權限凍結清單（含 `classroom_activities:DELETE` 現況釘住與 `register_question_asset_evidence` 不開放給 authenticated）、以真實 role＋`request.jwt.claims` 的 RLS 行為測試（不用 postgres 跑斷言）。
- `supabase db lint --level error`：0 錯誤。`npm run verify:db` 全綠。
- GitHub Actions 已加 `db` job（`supabase db start` → `test:db` → `lint:db`）。

仍待補（P0-2 第二階段）：題庫治理 runtime（雙票、凍結 hash、發布、停權、不可變 trigger、素材 receipt）、課堂 constraint（exact/conflicting replay、private schema 權限）、雙連線 TypeScript 併發 harness。以下保留原始敘述供追溯。

#### 原始敘述

現有 migration 測試都是讀 SQL 後做 regex／字串比對，不能證明 SQL 真的可執行，也不能證明 RLS、GRANT、constraint 或 transaction 行為。

目前專案條件：

- `supabase` dev dependency：2.109.1。
- `supabase/config.toml`：PostgreSQL 17、migration enabled、seed disabled。
- 現行 migration 約 4,594 行，含 16 個資料表與 32 個 public RPC。
- 接手機器當下沒有可用的 Docker、Podman、`psql` 或 `pg_prove`；Docker context 指向不可用的 OrbStack socket。
- 不要用裸 PostgreSQL 模擬，因為 migration 依賴 `auth.users`、`auth.uid()`、`auth.jwt()` 與 Supabase roles。

建議建立 DB-only 驗證腳本：

```json
{
  "db:start": "supabase db start",
  "db:reset": "supabase db reset --local --no-seed",
  "test:db": "supabase test db --local supabase/tests/database",
  "lint:db": "supabase db lint --local --schema public,private --level error --fail-on error",
  "verify:db": "npm run db:reset && npm run test:db && npm run lint:db"
}
```

旗標已由 Supabase CLI 2.109.1 的 `--help` 確認。先安裝或恢復 Docker-compatible runtime，再新增 pgTAP：

1. schema／function／privilege／RLS smoke。
2. 題庫治理 runtime：角色、凍結 hash、雙票、發布、停權、不可變 trigger 與素材 receipt。
3. 課堂 constraint：跨班外鍵、匿名加入、exact replay／conflicting replay 與 private schema 權限。
4. 另用雙連線 TypeScript harness 測併發；pgTAP 單連線不足以證明 advisory lock 與停權／發布競態。

測試必須切換真實 caller role 並設定 `request.jwt.claims`；全程用 `postgres` 會因 BYPASSRLS 產生假陽性。

### P0-3：原子 trusted worker

目前 CLI 只輸出本機 production bank／report，沒有建立治理版本或呼叫 `register_question_asset_evidence`。現有單筆 RPC 雖有單筆冪等性，但逐題呼叫會留下部分成功；證據又不可更新／刪除。

正確公共 use case 應為：

```ts
verifyAndRegisterProductionAssets({
  questionBankBytes,
  manifestBytes,
  publicRoot,
  rightsRoot,
  questionVersions,
  registrar,
});
```

必要條件：

- 同一 use case 內重新讀 bytes 驗證，不接受外部手工組出的 `VerifiedProductionAssetBundle` 或舊 report 當信任能力。
- 接受完整 `questionId → questionVersion` binding，拒絕缺漏、重複與額外題號，不假設永遠是 version 1 或「最新版本」。
- server-only 模組與目前被 `"use client"` 匯入的 gateway 完全分離；核心函式只接受注入的 registrar port，不接受 key 字串。
- DB 端新增單一 `register_question_asset_evidence_batch(p_batch jsonb)`，一個 PostgREST RPC／一個 transaction；任一筆失敗整批 rollback。
- 相同 batch 可安全重試；DB 已 commit 但網路回應遺失時，重試必須取得原 receipt。
- 完整保存 verifier 真正讀完 bytes 的 `verifiedAt`、來源題庫 hash、production bank hash 與 manifest hash。
- 若範圍同時包含建立 200 個版本，應提升成單一 `import_production_question_bundle`，避免題目匯入與素材登錄兩個 RPC 之間留下半成品。

### P0-4：不可覆寫正式儲存

content-addressed 檔名不會自動阻止相同路徑被覆寫。目前發布 RPC 比對的是資料庫 receipt metadata，沒有重新讀物件 bytes。

需二選一或同時採用：

1. 正式 bucket／物件版本採不可 update／delete 的政策，locator 永久對應同一組 bytes。
2. 可信發布 worker 在正式發布前重新讀素材與權利文件，重算 hash／length／MIME，再呼叫受限發布 RPC。

不要把 `supabase/config.toml` 內仍被註解的 bucket 範例當成已完成設定。

## 五、P1 與需確認項目

- 建立可稽核、一次性的管理員／教師／複核者 bootstrap 流程；目前 UI 只能讀既有 profile。
- 建立 GitHub Actions，將 Node 22、lint、typecheck、Vitest、build 與可行的 Playwright／DB test 綁定 commit SHA。
- 檢查 migration 對 authenticated 直接 `DELETE public.classroom_activities` 的授權是否真為刻意例外；用 privilege runtime test 固定決策。
- 若任何環境曾套用舊版 RPC，必須使用 forward migration；不要只修改既有 migration 後假設升級環境會自動修正。
- Octalysis 若要從 70 推向 80，優先做跨週班級章節、教師週進度、多解任務、安全策略配方、跨裝置接力與更多規則透明的知識星；不要用倒數、扣收藏或焦慮機制硬補分。

## 六、不可由程式冒充完成的外部閘門

- 製作並驗證 49 份正式音訊／圖片及去識別權利證明。
- 由兩位可驗證身分、具英語教學背景者逐題複核 200 題。
- 真實兒童實測。
- 遊戲設計、英語教學、兒童 UX 三角色正式評分。
- 真實媒體解碼、完整 WCAG、資安與多裝置總驗收。
- 使用者確認專用 Supabase 組織、專案與費用後，才可連結雲端專案。

## 七、Git 與部署注意事項

- 公開 repository 只包含 `english-hero-island` 子專案；若從母工作區操作，只 stage `generated-pages/english-hero-island`，不要 `git add -A`。
- Vercel 只用 Preview。部署後以 `vercel inspect <url> --format=json` 確認 `target: preview` 與 `readyState: READY`，並確認 production deployment 仍為 0。
- 接手機器的全域 Vercel CLI 曾為 55.0.0；建議執行 `npm i -g vercel@latest`，或持續使用 `npx --yes vercel@latest`。
- 不得提交 `.env.local`、service-role key、database password、Vercel token、授權原件個資或 `.vercel/`。
