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

- 兩份試算表目前對外公開可讀，任何有連結者可匯出全部資料（含調查人員姓名）。若需保密須改為私有並啟用 `sheetsApi`。
- 照片已下載壓縮成 webp 存進 repo（`public/assets/photos/`，480 張約 80MB），前端載入本地檔案，已無 Google Drive 限流問題（此即提示詞的選用強化，已啟用）。抓取時增量下載新照片，下載失敗者（本次 0 張）保留 Drive 網址 fallback。前端仍保留 lh3 端點 + 延遲載入 + 重試邏輯，供 fallback 情境使用。
- Vite 8 的 bundler（rolldown）在 Windows 對含中文的專案路徑有 bug，`npm run build` 會 exit 127 失敗。已用 ASCII 路徑驗證確認與程式碼、sharp、照片皆無關。GitHub Actions 在 ASCII 路徑不受影響，部署 build 正常。本機 build 改用 `npm run build:win`（在 ASCII 暫存路徑 build 再複製 dist 回），已驗證可用；或把專案移到純英文路徑。
- 部分調查儲存格為使用者自由填答（如覆蓋率欄填「普通」、多值「0%, 90%」），如實呈現原始值不做清洗。
