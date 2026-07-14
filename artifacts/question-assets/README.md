# 正式題目素材匯入區

這個資料夾目前只保存正式素材契約，不代表 49 個音訊與圖片已經完成。現況是 24 份音訊、25 份圖片待補，實體正式素材為 0／49。

## 必要檔案

1. 從最新教師預審包複製 `production-assets.manifest.template.json`，另存為本資料夾的 `production-assets.manifest.json`。
2. 將素材放在 `public/assets/question-assets/<asset-sha256>.<ext>`。
3. 將權利證明放在 `artifacts/question-assets/rights/<kind>/<document-sha256>.<ext>`。
4. 填入 manifest 的公開 locator、SHA-256、byte length、MIME 與權利文件 receipt。

正式素材與權利文件都必須用 SHA-256 作為檔名；只填 metadata、沒有實際檔案，驗證仍會失敗。音訊只接受 MP3、WAV、Ogg，圖片只接受 JPEG、PNG、WebP；初版不接受 SVG。

## 執行匯入

```sh
npm run ingest:production-assets
```

- 驗證通過才會以暫存檔寫入 `artifacts/question-bank/production-question-bank.json` 與 `verification-report.json`；報告最後提交，並保存實際輸出題庫的 SHA-256 與 byte length。
- 素材或權利證據缺漏、hash／長度／MIME／題目綁定不符時，退出碼為 1，且會移除舊的 `verification-report.json` commit marker。即使磁碟上仍有先前題庫檔，沒有與目前 bytes 相符的報告也不得視為有效正式輸出。
- 執行環境或非預期錯誤的退出碼為 2。
- 匯入鎖會包住舊報告失效、讀檔、驗證、暫存寫入與最後提交；若已有匯入執行中，後來的程序會保留既有報告並拒絕開始。同一工作目錄不可平行執行；iCloud 同步不是分散式鎖，不同電腦也不得同時執行這項匯入。

此 CLI 只驗證本機 bundle 並輸出 production question bank／verification report，不會自行連線 Supabase、建立治理版本或呼叫 `register_question_asset_evidence`。資料庫匯入必須由不暴露 service role key 的 server-only worker 另行完成，且每次匯入前都要重新驗證目前 bytes，不能沿用舊報告推定新素材合格。

驗證器只能證明檔案 bytes、綁定與權利文件沒有被替換；magic bytes 只檢查檔頭，不等於瀏覽器可播放或可解碼。授權文件的法律效力仍須由真人確認。公開 repository 只能放去識別、可公開的權利證明，不得提交含個資、金額或未公開契約內容的原件。
