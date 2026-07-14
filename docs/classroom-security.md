# 課堂版安全架構與上線閘門

更新日期：2026-07-14

## 目前結論

教師快派、學生匿名加入、教師啟動、無排名即時狀態、答案隔離、伺服器判分與全班共同 Boss 的程式垂直切片已完成。資料庫 migration 具有 RLS、最小權限 grant、`security definer` RPC 與不可變學習事件，並由靜態契約測試保護。

這不等於已可正式上線：目前沒有為本系統建立或連結專用 Supabase 專案，migration 尚未在真實 PostgreSQL runtime 套用，Realtime 與跨裝置流程也尚未實機驗證。前端因此在缺少公開設定時顯示安全閘門，不會模擬可用的活動碼。

## 信任邊界

| 區域 | 可以知道 | 不可以知道或直接改寫 |
|---|---|---|
| 學生瀏覽器 | 公開題幹、選項、自己的參與狀態、作答後回饋、全班共同修復值 | 作答前正解、其他學生作答、教師資料、任意學習結果 |
| 教師瀏覽器 | 自己被指派的班級、可派的雙人複核能力、參與者支援狀態 | 題庫私有答案欄、其他教師班級、直接竄改活動生命週期或學習事件 |
| `public` schema | 班級活動投影、參與狀態、答案隔離後的活動題目、共同故事進度 | 未複核草稿的私有題庫內容 |
| `private` schema | 具版本的完整題目、正解、解析、提示、複核資訊 | 不開放給瀏覽器角色直接讀取 |

瀏覽器只使用專用專案的 publishable key。service role key、資料庫密碼及其他管理權限不得出現在 `NEXT_PUBLIC_*` 環境變數或前端 bundle。

## 身分與資料流程

1. 教師以電子郵件 Magic Link 登入；`teacher_profiles` 必須是 `approved`，且班級需明確指派給該教師。
2. 教師只能從正式發布、具有至少兩筆複核紀錄的題目建立 3／5 題活動。
3. 學生以 Supabase 匿名身分、六碼與暱稱加入。系統不要求真實姓名、電子郵件、照片或生日。
4. 教師透過專用 RPC 啟動活動；瀏覽器沒有直接更新活動狀態的權限。
5. 學生取得的題目投影不含 `correct_option_id`、解析或提示答案。
6. 作答交由 `submit_classroom_response` 在伺服器查正解、判定學習結果、寫入作答與不可變學習事件，再回傳該題解析。
7. 同一位參與者、活動、題目與版本具有唯一約束；裝置事件 ID 讓網路重試維持冪等。
8. Realtime 只用來刷新參與狀態；看板不顯示分數、速度、名次或完整錯題內容。

## 主要防護

- 所有公開課堂資料表啟用並強制 RLS。
- 新資料表不依賴自動曝光；migration 使用明確 revoke／grant。
- 教師查詢皆同時檢查 `auth.uid()`、核准狀態與班級所有權。
- 學生只能讀取或提交與自己匿名身分綁定的活動資料。
- 活動建立、加入、啟動與作答都走具固定 `search_path` 的 RPC。
- 正解放在 `private.question_versions`，活動題目只保存題目 ID、版本與位置。
- 學習事件由資料庫 trigger 阻擋 update／delete。
- 正式題庫不自動 seed，避免把 60 題草稿誤當雙人複核正式題。

## 正式上線前硬性閘門

- 建立經使用者確認方案與費用的專用 Supabase 專案；不得借用既有無關專案。
- 在雲端設定開啟匿名登入與教師電子郵件登入，完成 redirect URL 與郵件寄送測試。
- 先執行 migration dry run，再套用並用真實 PostgreSQL 驗證所有 RLS、RPC、trigger、constraint 與 Realtime。
- 補管理者 bootstrap 流程，建立核准教師與班級；管理入口不得暴露 service role key。
- DB 端再加強「兩位不同複核者」的可驗證結構。目前 application domain 會檢查不同 reviewer，但 JSON 陣列長度約束本身不能證明身分不同。
- 完成至少 200 題原創變式題的兩位英語教師複核、版本追蹤、授權來源與抽樣稽核。
- 完成濫用測試、速率限制、匿名帳號清理與資料保存／刪除政策。
- 進行真實桌機、手機、平板跨裝置活動，以及鍵盤、螢幕閱讀器與弱網路測試。
- 由遊戲設計、英語教學、兒童 UX 三種角色獨立做 Octalysis 中位數驗收；即使達 70／80，兒童安全閘門未過仍不得發布。

## 參考

- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
