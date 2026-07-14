# 英語英雄島

國小三至六年級英語學習扶助遊戲化自學系統。學生透過短回合診斷、能力練功、Boss 戰與跨日修煉，建立可解釋的英語能力證據。

## 專案狀態

目前正在實作「學生端垂直切片」，不是正式公開版。試作題目在兩位英語教師完成複核前一律維持草稿狀態，不能進入正式學習回合。

完整完成條件包含：

- 國小三至六年級完整主線。
- 200 題經兩位英語教師複核的原創變式題。
- 學生冒險、教師課堂與題庫治理三個子系統。
- Octalysis 實測至少 70／80，並另行通過兒童安全閘門。
- 內容、資安、無障礙、多裝置及自動化測試全部有直接證據。

## 核心原則

- Boss 通關不等於能力精熟。
- 答錯不會 Game Over，也不會失去 XP、能力、徽章、提示或必學內容。
- 只有 Learning Engine 能建立不可變學習事件；戰鬥與獎勵只讀取事件。
- 自主使用不要求真實姓名、電子郵件、照片或生日。
- 未經兩位英語教師複核的題目不得標示為正式發布。

## 技術

- Next.js App Router、React、TypeScript
- Zod
- Vitest、Testing Library、Playwright
- IndexedDB（學生本機進度，後續里程碑）
- Supabase（教師、班級、正式題庫與伺服器判分，後續里程碑）
- Vercel Preview（通過驗收後）

## 本機開發

需求：Node.js 22 LTS 與 npm。

```bash
nvm use
npm install
npm run dev
```

開啟 `http://localhost:3000`。

## 品質指令

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 文件

- 設計規格：`../../docs/superpowers/specs/2026-07-14-english-hero-island-design.md`
- 實作計畫：`../../docs/superpowers/plans/2026-07-14-english-hero-island-plan.md`

## 授權與內容

程式碼授權將於公開 repository 建立前定案。題庫內容、圖片、音訊與外部研究來源各自記錄來源及使用權利；未明確授權的公開考古題只作能力與題型研究，不直接重製。
