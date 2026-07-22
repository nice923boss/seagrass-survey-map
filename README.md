# 海草調查點位資訊查詢地圖

政府海草生態調查的公開資料網站。在自訂底圖上以編號標記呈現調查點位，點擊即可依日期查閱該點位的完整調查資料與現場照片。資料自動從 Google 試算表同步。純靜態網站，部署於 GitHub Pages。

## 功能

- **穩定的標記定位**：Leaflet `CRS.Simple` + `imageOverlay`，標記存底圖像素座標，與視窗尺寸、縮放無關，標記與底圖相對位置永遠不變。
- **點位資料檢視**：點擊標記開側邊面板，預設最新調查日期、下拉切換歷史日期、分區呈現欄位（樣框覆蓋率、水質、水生物、植株物候等）、照片縮圖網格 + 燈箱（鍵盤左右、Esc）。
- **管理者模式**（`/admin.html`）：上傳底圖、拖曳與增刪標記、即時座標、匯出 `markers.json`、選用 GitHub 寫回。
- **資料自動同步**：GitHub Actions 排程從試算表抓取、驗證、正規化、有變更則 commit，觸發重新部署。

## 技術

Vite + TypeScript + Leaflet，無重型框架。所有執行期邏輯在瀏覽器端；所有需要憑證的工作在 GitHub Actions 內完成。介面繁體中文，日期格式 `YYYY-MM-DD`。

## 目錄結構

```
index.html / admin.html        前台 / 管理者兩個進入點
src/
  main.ts / admin.ts           進入點
  map/                         地圖建立、編號標記
  panel/                       點位面板、照片網格、燈箱
  admin/                       編輯器、GitHub 寫回
  data/                        型別、載入、Drive 照片解析
  styles/                      樣式
scripts/                       抓取正規化（Node）
  fetch-surveys.ts / normalize.ts / validate.ts
  sources/                     csvPublic（預設）、sheetsApi（待啟用）
public/
  data/markers.json            標記設定（admin 產出）
  data/surveys.json            調查資料（腳本產出）
  assets/                      底圖
docs/DATA_CONTRACT.md          試算表欄位對 JSON 對應
.github/workflows/             deploy、sync-data
```

## 本機開發

```bash
npm install
npm run dev         # 開發伺服器（http://localhost:5173）
npm run fetch:data  # 抓試算表產出 public/data/surveys.json
npm run build       # 打包到 dist/
npm run build:win   # Windows 且專案在中文路徑時改用這個
npm run typecheck   # 型別檢查
```

> Windows 中文路徑注意：Vite 8 的 bundler（rolldown）在 Windows 對含中文的專案路徑有 bug，`npm run build` 會 exit 127 失敗（bundler 問題，與程式碼無關，已用 ASCII 路徑驗證）。GitHub Actions 在 ASCII 路徑不受影響，**部署正常**。本機要 build 或 preview 時改用 `npm run build:win`（自動在 ASCII 暫存路徑 build，再把 dist 複製回），或把專案移到純英文路徑。

## 資料更新

資料來源以環境變數 `DATA_SOURCE` 切換：

- `csvPublic`（預設）：公開 CSV 匯出，零憑證。`npm run fetch:data`
- `sheetsApi`：Service Account 唯讀。`DATA_SOURCE=sheetsApi npm run fetch:data`

流程：抓兩份試算表，驗證（點位須 1-10、日期須合法，異常則中止並回傳非零），正規化（見 `docs/DATA_CONTRACT.md`），寫入 `public/data/surveys.json`。調查日期漏填時會退回以時間戳記的日期為準。

## 調整欄位對應

分組規則在 `scripts/normalize.ts` 的 `classify()`，對照 `docs/DATA_CONTRACT.md`。表單新增欄位時：屬既有區塊關鍵字者自動歸類；全新類別歸「其他」並印警告，可再擴充 `classify()` 規則。兩者需同步更新。

## 更新底圖

管理者模式僅限本機，先 `npm run dev`：

1. 開 http://localhost:5173/admin.html。
2. 「選擇檔案」上傳新底圖（自動讀取原始尺寸）。
3. 拖曳調整標記位置，即時顯示座標。
4. 「匯出 markers.json」。
5. 把匯出的 `markers.json` 放到 `public/data/`，底圖圖檔放到 `public/assets/`（檔名需與 `basemap.src` 一致）。
6. commit 推送，或用 admin 的「直接寫回 GitHub」。

## Service Account 設定（資料同步主方案，選用）

1. Google Cloud 建專案，啟用 Google Sheets API。
2. 建 Service Account，下載 JSON 金鑰。
3. 把兩份試算表「共用」給 Service Account 的 email（檢視者即可）。
4. repo `Settings → Secrets and variables → Actions`：Secrets 設 `GOOGLE_SERVICE_ACCOUNT_JSON`（整段 JSON），Variables 設 `DATA_SOURCE=sheetsApi`。
5. 若工作表名稱非「表單回應 1」，Variables 設 `SHEET_TAB_NAME`。

註：目前試算表公開可讀，`csvPublic` 即可零設定自動同步。Service Account 僅在試算表改為私有時才需要。憑證只存於 GitHub Secrets，絕不進 repo 或前端 bundle。

## 照片

照片已下載並壓縮成 webp（長邊 1600px）存進 `public/assets/photos/`，前端直接載入本地檔案，徹底免除 Google Drive 的限流與破圖問題。

- 抓取時（`npm run fetch:data`）自動**增量**下載新照片（已存在的跳過），`surveys.json` 內照片指向本地路徑。
- 少數下載失敗者（Drive 端問題）保留 Drive 網址作為 fallback，前端仍會嘗試載入或提供「在 Drive 開啟」連結。
- 停用本地化改回 Drive 直連：`DOWNLOAD_PHOTOS=false npm run fetch:data`。
- 前置條件：Drive「檔案回應」資料夾需為「知道連結的任何人可檢視」（目前已驗證公開），下載才抓得到。
- GitHub Actions 的自動同步會一併把新照片 commit 進 repo。

## 部署

`.github/workflows/deploy.yml` 在 push 到 `main` 時 build 並部署 Pages。

- base path 自動取用 repo 名稱（`<user>.github.io/<repo>/`）。
- 自訂網域：把 `deploy.yml` 的 `VITE_BASE` 改為 `/`。
- 啟用：repo `Settings → Pages → Source` 選「GitHub Actions」。

自動同步 `sync-data.yml`：每日排程 + 手動觸發（`workflow_dispatch`），資料有變更才 commit，進而觸發重新部署。

## 管理者模式的定位與升級路徑

`/admin.html` 僅供**本機開發**使用：公開部署（GitHub Pages）不會打包 admin.html（輸入該網址為 404），前台的「管理者模式」連結也只在 localhost 顯示。要編輯標記時，在本機 `npm run dev` 後開 http://localhost:5173/admin.html。此行為由 `vite.config.ts`（build 排除 admin）與 `src/env.ts`（hostname 判斷）控制；若確實要把 admin 一併部署，build 時設 `VITE_INCLUDE_ADMIN=true`。

這是**操作介面的區隔，不是安全邊界**。純靜態網站無伺服器端身分驗證，任何寫在前端的密碼都能被檢視原始碼看到；隱藏入口只是降低誤觸，並非防護。標記座標並非機密資料，這個取捨合理。

若日後需要真正的權限控管，改用具備後端的方案：Cloudflare Pages Functions 或 Netlify Identity，在後端驗證身分後才允許寫入。

## 隱私

兩份試算表目前對外公開可讀，任何有連結者可匯出全部資料（含調查人員姓名）。若需保密，將試算表改為私有並啟用 Service Account（`sheetsApi`）。
