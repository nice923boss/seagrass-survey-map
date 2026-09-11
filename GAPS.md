# GAPS 落差登記簿

誠實記錄尚未完成、未實測或需使用者補齊的項目。交付前公開揭露，不靜默降級。

## 待啟用（程式已寫，需憑證或條件才能實跑）

| 項目 | 狀態 | 補完條件 |
|---|---|---|
| `sheetsApi` 資料來源（Service Account） | 介面與實作完成，未經真實憑證實跑 | 使用者於 Google Cloud 建 Service Account、分享試算表、設 `GOOGLE_SERVICE_ACCOUNT_JSON` secret 後可用。目前試算表公開，`csvPublic` 已足夠。 |
| GitHub REST API 寫回 markers.json | 介面與 UI 完成，未經真實 PAT 實測 | 使用者於 admin 輸入 owner/repo/PAT 後可用。屬選用功能。 |

## 未經瀏覽器實測（邏輯已實作，用標準 API）

| 項目 | 說明 |
|---|---|
| admin 底圖上傳 | 使用 FileReader + Image.naturalWidth 讀尺寸，標準 API。未用真實檔案在瀏覽器 file input 實測。 |
| 320px 極窄視窗 | 已實測 375px（手機）與 904/1280px（桌面）定位穩定，320px 未單獨截圖。 |

## 需使用者提供

| 項目 | 影響 | 現況替代 |
|---|---|---|
| 真實底圖影像 + 尺寸 | 正式底圖 | 先用 placeholder（2400×1600），admin 上傳即可替換 |
| GitHub repo 名稱 | 部署 base path | deploy workflow 自動用 repo 名稱，無需手動提供；自訂網域時改 `VITE_BASE=/` |

## 已知現況（非缺陷，需知情）

- 試算表目前對外公開可讀，任何有連結者可匯出全部資料（含調查人員姓名）。若需保密須改為私有並啟用 `sheetsApi`。
- **新總表缺 2026-06-28 之後的資料**（2026-09-11 確認）：客戶提供的單一總表只有 32 筆，最新日期 2026-06-28。舊的兩份表單回應中 7/18、7/21、7/23、8/09 的紀錄（含客戶提到的點位 10 於 7/23、點位 6、7、8 於 8/9）**不在總表內**。依指示改讀總表後，這些紀錄會從網站消失，需客戶把它們補進總表（或確認總表是否有其他工作表），之後每日同步會自動帶上。
- 專員編輯頁的 token 嵌在前端 JS，任何拿到網址或檢視原始碼者都能用它寫入此 repo（權限僅 Contents）。屬已知取捨，見 README「專員點位編輯」。
- 專員編輯頁「儲存到網站」已於 2026-09-11 以真實 PAT 在線上實測：拖曳點位 10 後儲存，commit `7050217` 進 main 並觸發 deploy，線上 markers.json 更新；之後以 commit `3614846` 還原座標。repo secret `EDITOR_GITHUB_TOKEN` 已設定。
- 2026-07-22 至 2026-09-11 間網站資料未更新的根因：sync 用 `GITHUB_TOKEN` 推送的 commit 不會觸發 `deploy.yml`。已在 `sync-data.yml` 加上明確觸發，並經實跑驗證（見 README「部署」）。
- 照片已下載壓縮成 webp 存進 repo（`public/assets/photos/`，480 張約 80MB），前端載入本地檔案，已無 Google Drive 限流問題（此即提示詞的選用強化，已啟用）。抓取時增量下載新照片，下載失敗者（本次 0 張）保留 Drive 網址 fallback。前端仍保留 lh3 端點 + 延遲載入 + 重試邏輯，供 fallback 情境使用。
- Vite 8 的 bundler（rolldown）在 Windows 對含中文的專案路徑有 bug，`npm run build` 會 exit 127 失敗。已用 ASCII 路徑驗證確認與程式碼、sharp、照片皆無關。GitHub Actions 在 ASCII 路徑不受影響，部署 build 正常。本機 build 改用 `npm run build:win`（在 ASCII 暫存路徑 build 再複製 dist 回），已驗證可用；或把專案移到純英文路徑。
- 部分調查儲存格為使用者自由填答（如覆蓋率欄填「普通」、多值「0%, 90%」），如實呈現原始值不做清洗。
