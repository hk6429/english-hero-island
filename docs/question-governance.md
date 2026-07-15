# 題庫治理與真人雙人複核

## 目前狀態

本專案已完成題庫治理安全底層的程式與靜態契約，以及支援「建立／批次匯入 → 素材證據登錄 → 搜尋與預覽 → 送審 → 真人複核 → 管理員發布／爭議／退役 → 建立新版」的前端垂直切片。資料庫契約與介面測試已通過，但 migration 尚未套用到專用 Supabase 專案，不能視為正式 runtime 驗證或已完成真人複核。

目前治理候選庫已有 200 題原創草稿：原本 60 題與新增 140 題目前都已進入學生自主冒險流程（詳見 README「專案狀態」），140 題同時也匯入治理流程供真人複核。程式不會產生假複核者、假簽名或自動把草稿標示為正式發布。

執行 `npm run export:review-candidates` 會產生 `artifacts/question-bank/review-candidate-question-bank.json`。匯出內容只保留題號與題目內容，版本、狀態、作者與複核者由伺服器依登入身分建立；任一題驗證失敗時不產生可匯入結果。

執行 `npm run export:teacher-prereview` 會另產生 `artifacts/teacher-prereview-pack/draft-<來源雜湊>/`。這是草稿預審包，不是正式凍結快照：它提供 200 題閱讀 CSV、逐題內容雜湊、兩份獨立教師回覆表、驗證報告、49 題試作素材阻擋清單及 49 筆空白正式素材 intake template，但不包含教師身分、複核時間、伺服器票數或簽章。

## 狀態流程

```text
draft
  ↓ 送審並凍結版本
in_review
  ├─ 任一位合格複核者要求修正 → disputed → 建立下一版 draft
  └─ 兩位不同的合格英語教師通過 → reviewed
                                         ↓ 管理員獨立發布
                                      published
                                         ├─ 爭議回報 → disputed
                                         └─ 管理員停用 → retired
```

兩票只會讓版本成為 `reviewed`，不會自動發布。每份不可逆複核在送出前都有二次確認。依目前 migration 靜態契約，發布時會重算凍結快照 SHA-256、重建目前素材證據並與 `assetEvidence` 完整比對，再確認兩位複核者目前仍是核准中的英語教師、題目來源授權合格、同題沒有另一個仍在發布中的版本；`tts:`、`scene:`、`data:`、外部 URL 或缺少 content-addressed receipt 的媒體會被拒絕。這些行為仍須在專用 PostgreSQL runtime 實證。

## 身分與不可變證據

- `content_reviewer_profiles`：保存真實登入帳號對應的治理角色與核准狀態。
- `question_reviews`：每位複核者對每個題目版本只能留下恰好一份複核，並保存該次確認的 SHA-256 與 hash schema；複合外鍵要求它們必須等於該題凍結收據，且紀錄禁止更新與刪除。
- `question_status_events`：保存複核、轉為已複核、發布、爭議與退役事件；禁止更新與刪除。
- `question_versions`：保存線性版本關係、修改摘要、作者、凍結時間、複核完成時間與發布時間。送審同一交易會以資料庫實際內容建立 `review_snapshot`、SHA-256、版本化 hash schema 與雜湊時間；凍結後四欄都不可修改。
- `question_asset_evidence`：針對音訊／圖片分開保存素材 locator、素材 SHA-256、byte length、MIME、素材權利來源、權利證明 receipt、manifest 與來源題庫雜湊；紀錄只能由受信任 worker RPC 在未鎖定草稿階段登錄，建立後禁止更新與刪除。同一素材或權利文件 locator 的跨題登錄會先序列化，若 receipt metadata 衝突就拒絕。

目前 hash schema 是 `question-review-snapshot-pg-jsonb-text-v1`，明確代表 PostgreSQL JSONB 文字序列化後的專案內 SHA-256；它不是 RFC 8785 或數位簽章。音訊／圖片題的快照已包含受信任 worker 登錄的 byte receipt metadata，因此內容 hash 會間接綁定實際素材與權利文件的 SHA-256、長度與 MIME，但資料庫本身不會讀取物件 bytes。內容編輯送審後會取得完整伺服器凍結收據；複核者會在題卡與不可逆確認框看到完整題目與素材收據，送出時帶回 expected receipt。伺服器鎖定該版本後精確比對，再把資料庫權威值寫入不可變複核紀錄與狀態事件；gateway 也會拒絕缺漏、種類／locator 不符或 acknowledged receipt 不一致的回應。這仍只有程式與靜態契約證據，尚待專用 PostgreSQL runtime 驗證。

作者不得複核自己建立的版本。停權、待核准、非英語教師角色或匿名帳號都不能送出複核；同一人也不能重複計票。

## 七項複核標準

複核者必須逐項確認：

1. 英文內容正確。
2. 只有一個合理正解。
3. 解析正確且學生看得懂。
4. 提示能協助思考且不直接洩題。
5. 音訊、圖片與文字內容一致。
6. 來源與授權可供本專案發布。
7. 情境與用語適合該年級。

「通過複核」需要七項全部為真，並留下至少四個字的意見。「退回修正」至少需要一項為假，會保存未通過項目與具體意見，該版本隨即轉為 `disputed`。伺服器只接受恰好這七個布林鍵值，額外鍵、缺漏鍵或非布林值都會拒絕。

## 保護性 RPC

- `get_content_governance_profile()`：只回傳登入者自己的伺服器治理角色與核准狀態。
- `create_question_draft(...)`：由伺服器寫入作者身分並驗證完整題目內容。
- `import_question_drafts(...)`：只接收題號與題目內容，治理身分由伺服器補入；先驗證整批草稿再寫入，任一筆不合格時整批失敗。
- `create_question_revision(...)`：從指定版本建立下一版草稿，保留線性版本關係與修改摘要。
- `register_question_asset_evidence(...)`：唯一可由 server-only service role 呼叫的素材登錄入口；只接受未鎖定草稿，並要求種類、content-addressed locator、素材／權利 receipt 與題目內容一致。它信任 worker 已實際讀取 bytes，不能放在瀏覽器或用來冒充法律審查。
- `submit_question_for_review(...)`：再次驗證作者、草稿狀態與內容；媒體題必須恰有一份符合 modality 與 locator 的正式素材收據，文字題必須為零份，才會在同一交易建立不可變內容快照與 SHA-256 凍結收據。
- `search_question_bank(...)`：內容編輯與管理員可搜尋完整治理庫；英語教師只可搜尋 `published` 題目以回報爭議，不能藉此讀取 `in_review` 票數。
- `list_question_versions(...)`：只讓內容編輯與管理員取得同題版本歷程、比較內容與複核票數。
- `list_question_quality_signals(...)`：只回傳匿名彙總答對證據與爭議狀態，不暴露學生作答明細。
- `list_question_review_queue()`：只讓核准英語教師看見自己尚未複核、且不是自己建立的凍結版本，並回傳該版本的題目、素材證據、SHA-256 與 hash schema，不回傳他人票數。
- `submit_question_review(...)`：驗證真人資格、自我複核、重複複核、品質標準、版本狀態與 expected receipt；只保存伺服器鎖列後取得的 authoritative acknowledgement。
- `publish_question_version(...)`：只允許核准管理員獨立發布；會重新驗證快照 SHA、frozen/current 素材證據、content-addressed 音訊／圖片、題目授權、兩位目前仍有效的英語教師，以及同題沒有另一個發布中版本。
- `report_question_dispute(...)`：讓核准英語教師或管理員留下爭議證據並停用該版本。
- `retire_question_version(...)`：只允許核准管理員停用版本，不刪除歷史。

正式課堂選題也不讀取使用者可填寫的複核名單，而是直接計算 `question_reviews` 中兩位不同、目前仍有效的英語教師通過紀錄。

## 前端安全邊界

- `/governance` 未連到專用 Supabase 時只顯示安全閘門，不建立本機假佇列。
- 未登入時使用 Magic Link；RPC 仍會在伺服器重新確認角色，不能只靠畫面隱藏按鈕。
- 核准內容編輯者只能建立、匯入、搜尋、送審與修訂；發布與退役只對核准管理員開放。核准英語教師可從專用介面搜尋已發布題目並回報爭議；RPC 仍會獨立驗證權限。
- 待複核畫面會顯示正解、解析與來源，因此只經保護 RPC 提供給合格複核者，不出現在學生 payload。
- 複核卡會顯示伺服器凍結時間、完整題目 SHA-256、hash schema、素材與權利證明 SHA、MIME、byte length、locator、來源題庫／manifest hash 及 worker 驗證時間；review queue 不回傳其他教師的通過或退回票數，一般搜尋也限制英語教師只能讀取已發布題目，避免繞道形成從眾暗示。
- 前端送出後重新讀取伺服器佇列，不自行推定複核或發布成功。
- 搜尋涵蓋同題所有歷史版本並使用穩定游標分頁；只有最新版本能建立下一版，同題同時最多一個 `published` 版本。
- 外部圖片或音訊只有同源檢查明確得到 404／410 時才標示無法存取；跨來源或網路錯誤維持「未確認」，避免把連線限制誤報成內容破損。
- 依目前 migration 靜態契約，媒體題缺漏正式 receipt、種類／locator 不一致或凍結後證據改變時，送審與發布會 fail closed。資料庫不會主動讀取物件 bytes；bytes、magic-byte MIME 與權利文件由受信任 ingest worker 驗證，真人仍須判讀內容品質及授權文件是否足以發布。

## 尚未完成的正式發布閘門

- 在使用者確認 Supabase 組織、專案與費用後，於專用專案實際執行 migration 與 RLS／RPC runtime 測試。
- 製作 24 份音訊與 25 份圖片及其去識別授權證明，填完 49 筆正式素材 manifest；目前實體正式素材仍是 0／49，不能把空白 intake template 視為完成。
- 每次使用 production bank 前重新執行 bytes 驗證；正式物件儲存必須採不可覆寫或版本化路徑，或由可信發布 worker 在發布前重新讀取 bytes 驗證，不能只信任資料庫內舊 receipt。再將 200 題草稿匯入專用 Supabase，並由 server-only worker 逐題呼叫 `register_question_asset_evidence`。目前本機 CLI 尚未執行這段端到端資料庫匯入。
- 在專用 Supabase 實際驗證 receipt 重算、錯誤 expected receipt 的零副作用、複合外鍵、RLS／GRANT、雙人併發與停權競態；目前只有靜態 SQL 契約，不能宣稱 PostgreSQL runtime 已證明。
- 若任何環境曾套用舊版五參數 `submit_question_review`，必須用 forward migration 明確撤銷並刪除舊 overload，再重建七參數函式；舊 review 不得把事後 hash 回填後冒充當時確認，應保留為 unsigned 且不計票，或要求重新複核。
- 在真實瀏覽器／媒體解碼器確認 49 份素材可播放或可解碼、音訊時長與圖片尺寸合理；magic bytes 只能確認檔頭，不能取代內容驗收。
- 由兩位可驗證身分、具英語教學背景者逐題複核；不得以測試帳號冒充真人簽名。
- 完成內容、兒童安全、資安、無障礙與多裝置總驗收後，才可將正式版本部署公開環境。

## 自動化證據

- migration 靜態契約：複核身分、題目與素材 receipt／acknowledgement 綁定、不可變紀錄、盲審旁路限制、十四個題庫治理 RPC、角色權限、原子批次匯入與課堂選題雙票條件。
- 領域測試：匯入全成全敗、自我複核、資格、同題同版本唯一複核、狀態投影、版本 lineage 與保守品質判讀。
- gateway 測試：完整題目與 receipt 映射、媒體種類／locator／權利組合 fail closed、expected receipt 送出、acknowledged receipt 不一致時拒絕、伺服器錯誤傳遞、建立／匯入／修訂／送審，以及發布／爭議／退役分離。
- 素材驗證測試：直接讀取 bytes，檢查 bank／asset／rights SHA-256、長度、magic-byte MIME、content-addressed locator、權利組合、重複綁定與真實 200 題缺漏；目前精確阻擋 24 音訊與 25 圖片。
- 元件與工作區測試：題目表單、內容式批次匯入、搜尋預覽、含資產網址的版本比較、品質面板、角色按鈕、七項複核、完整題目與素材 receipt 顯示、不可逆操作確認、英語教師爭議回報、登入閘門與送出後重新載入。
- Playwright：桌機與 360px 手機皆驗證未連線時不會出現假的複核介面。
