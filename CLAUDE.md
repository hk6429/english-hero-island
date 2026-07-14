# Claude Code 接手說明

這是「英語英雄島」：國小三至六年級英語學習扶助的遊戲化自學、教師課堂與題庫治理系統。

開始工作前依序閱讀：

1. `README.md`
2. `docs/claude-code-handoff.md`
3. `docs/question-governance.md`
4. `docs/octalysis-audit.md`

## 工作邊界

- 使用繁體中文與台灣教育現場用語。
- Node.js 固定使用 `.nvmrc` 的 22；先執行 `nvm use`。
- 所有功能修改採測試先行，且必須保留 fail-closed 題庫治理。
- 不得把 `service_role` key 放進 `NEXT_PUBLIC_*`、瀏覽器 bundle、log 或 tracked 檔案。
- 未取得使用者對 Supabase 專案與費用的明確確認前，不連結或修改任何既有雲端 Supabase 專案。
- Vercel 只部署 Preview；不得自行 promote 到 production。
- 49 份正式媒體目前仍是 0／49，不得把 template、placeholder、magic-byte 測試 fixture 或 metadata 冒充正式素材。
- 200 題目前是治理草稿，不得捏造兩位真人英語教師的身分、簽名、票數或完成狀態。
- Octalysis 70／80 是程式證據複評，不是兒童、英語教師與遊戲設計師的正式驗收。

## 基本品質指令

```bash
nvm use
npm ci
npm run lint
npm run typecheck
npm test
npm run test:a11y
npm run test:e2e
npm run build
```

最後一次本機紀錄為 2026-07-14：389 個 Vitest、18 個無障礙 Playwright、36 個全套 Playwright 均通過；這是本機紀錄，repository 目前還沒有 GitHub Actions 證據。

## 目前最高優先序

1. ~~修正正式 Supabase 連線會被 CSP `connect-src 'self'` 阻擋的問題，並補 connected browser test。~~（2026-07-14 完成：CSP connect-src 由 `NEXT_PUBLIC_SUPABASE_URL` 導出最小 allowlist，含 `e2e/supabase-csp.spec.ts` connected browser test。）
2. 建立 Supabase/PostgreSQL 真實 runtime 測試，不再只用 regex 檢查 migration。（2026-07-14 第一階段完成：OrbStack 已復原、`npm run verify:db` = reset＋28 個 pgTAP＋`db lint` 全綠，並修掉 4 個 regex 測試抓不到的真實 SQL bug；深度 pgTAP——治理雙票/凍結/發布 runtime、課堂 replay constraint、雙連線併發 harness——仍待補。）
3. 實作「即時重驗 bytes → 明確題目版本綁定 → 單一原子 batch RPC」的 server-only trusted worker。
4. 建立不可覆寫／版本化的正式素材儲存，或由可信發布 worker 在發布前重新讀取 bytes。

詳細證據、建議介面、外部閘門與接手順序見 `docs/claude-code-handoff.md`。
