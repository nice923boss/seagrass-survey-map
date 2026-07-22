# 專案提示詞：海草調查點位互動地圖（靜態網站 / GitHub Pages）

> 使用方式：在專案資料夾開啟 Claude Code，把以下全文貼給它。
> 底部的「待補資訊」區塊請先自行填寫，或讓 Claude Code 在 Phase 0 向你確認。

---

## 一、角色與任務

你是一位資深前端工程師，專長是靜態網站架構、資料視覺化與 CI/CD 自動化。

請為一個**政府單位的海草生態調查公開資料專案**，從零建立一個靜態網站，部署在 GitHub Pages。目標是取代目前「人工在 Google 地圖上標點、手動貼資料與照片」的流程——那個流程繁瑣、點位在同區域密集重疊無法分辨、且 Google 地圖本身的圖資雜訊干擾了調查標記的辨識度。

新網站要做到：**資料自動從 Google 試算表同步、底圖由管理者自行上傳、標記點以編號清楚呈現且位置絕對穩定、點擊即可依日期查閱該點位的完整調查資料與現場照片。**

---

## 二、核心需求（依重要性排序）

### 1. 自訂底圖與穩定的標記定位（最高優先）

- 管理者可上傳自己的底圖影像（例如手繪示意圖、空拍圖、規劃圖），**不使用 Google Maps 或任何外部圖磚服務**。
- 底圖**不可用 CSS `background-image` 實作**。過去的失敗經驗是：背景圖會隨視窗縮放而位移，導致標記點與底圖對不上。
- 標記點必須**永遠固定在底圖影像的相對位置上**，不論視窗大小、螢幕解析度、使用者縮放，標記與底圖的相對關係都不能跑掉。

**指定技術方案（主方案）**：使用 **Leaflet + `L.CRS.Simple` + `L.imageOverlay`**。

- 以底圖的原始像素尺寸建立座標系（`[[0,0],[height,width]]`）。
- 標記座標直接存底圖的像素座標，天生與縮放無關。
- 免費取得平移、滾輪縮放、觸控手勢、標記叢集（若需要）、popup 等成熟行為。
- 設定 `maxBounds` 讓使用者無法把底圖拖出畫面外。

**備案（若你評估 Leaflet 過重）**：`position: relative` 的容器 + `<img>` 底圖（`width:100%; height:auto; display:block`），標記用 `position:absolute; left:X%; top:Y%; transform:translate(-50%,-50%)`，X/Y 為相對原始寬高的百分比。若採此案，需自行實作 pan/zoom，請在 Phase 0 說明取捨後再決定。

### 2. 標記點外觀

- 每個標記顯示**清楚可讀的編號數字**，對應試算表中的「點位 1」到「點位 10」。
- 編號在縮放的各個層級都要清晰（建議 SVG `divIcon`，而非點陣圖示）。
- 高對比、有描邊或底色，確保在任何底圖上都看得見。
- 有 hover / focus / 選中三種視覺狀態。
- 同區域點位密集時仍可分辨（可考慮：選中時放大、未選中時降低不透明度）。

### 3. 管理者模式（標記編輯）

在 `/admin.html` 提供獨立的編輯介面：

- 上傳／更換底圖（讀取影像原始尺寸並寫入設定）。
- 新增、刪除標記點，並指定其編號（1–10）。
- **以拖曳方式**自由移動標記到底圖任意位置，即時顯示座標。
- 匯出 `data/markers.json`。
- 可選：透過 GitHub REST API 直接把 JSON commit 回 repo（PAT 由使用者輸入，僅存於 `localStorage`，且介面上必須明確標示此風險）。

**重要——請對使用者誠實說明**：純靜態網站無法做真正的伺服器端身分驗證，任何寫在前端的密碼都能被檢視原始碼看到。因此「管理者模式」的定位是**操作介面的區隔，而非安全邊界**。標記座標並非機密資料，這個取捨是合理的。若日後需要真正的權限控管，需改用 Cloudflare Pages Functions 或 Netlify Identity 等具備後端的方案——請在 README 中記錄這個升級路徑。

### 4. 資料自動同步（Google 試算表 → 網站）

資料來源是兩份 Google 試算表，各自接收一份 Google 表單的回覆：

| 來源 | 涵蓋點位 | 工作表 |
|---|---|---|
| 試算表 A | 點位 1–5 | **僅讀取「表單回覆 1」** |
| 試算表 B | 點位 6–10 | **僅讀取「表單回覆 1」** |

**主方案**：GitHub Actions 排程任務（建議每日一次，並支援 `workflow_dispatch` 手動觸發）

1. 以 Google Service Account（唯讀權限）呼叫 Sheets API 讀取兩份試算表。
2. 正規化為統一 schema，合併為單一 `data/surveys.json`。
3. 驗證資料完整性（缺欄位、日期格式錯誤、點位編號超出 1–10 等），異常時讓 workflow 失敗並輸出清楚的錯誤訊息。
4. 若內容有變更則 commit 進 repo，觸發 Pages 重新部署。
5. 憑證存於 GitHub Secrets，**絕不寫入程式碼或 commit**。

**備案**：試算表「發布到網路」為 CSV，前端以 PapaParse 直接解析。優點是零憑證零後端；缺點是無法做資料清洗與驗證、欄位一改就壞、每次載入都需連線 Google。請將此實作為可切換的資料來源，但預設走主方案。

### 5. 照片處理（Google Drive）

- 試算表中有欄位存放 Google Drive 照片網址，**同一個儲存格可能包含多個網址**（以換行、逗號或空格分隔）。
- 需以正則式從各種格式中抽出 file ID，至少涵蓋：
  - `https://drive.google.com/open?id=<ID>`
  - `https://drive.google.com/file/d/<ID>/view?usp=...`
  - `https://drive.google.com/uc?id=<ID>`
  - `https://drive.google.com/thumbnail?id=<ID>`
- 轉換為可直接內嵌的網址：
  - 縮圖／列表用：`https://drive.google.com/thumbnail?id=<ID>&sz=w800`
  - 大圖／燈箱用：`https://lh3.googleusercontent.com/d/<ID>=w2400`
  - 兩者互為 `onerror` fallback。
- **前置條件（請在 README 與 Phase 0 明確提醒使用者）**：Google 表單上傳的檔案存放在表單擁有者 Drive 的「檔案回應」資料夾，預設為私有。**該資料夾必須設為「知道連結的任何人皆可檢視」，對外的直接圖片網址才會生效**，否則網站上所有照片都會是破圖。

**選用強化（做成 config flag，預設關閉）**：由 GitHub Actions 將照片下載、壓縮（webp、長邊上限 1600px）後 commit 進 `assets/photos/`，徹底免除 Drive 權限與流量限制風險。需在文件中註明 GitHub repo 建議控制在 1 GB 以內、單檔不超過 100 MB。

### 6. 點位資料檢視

點擊標記點後，顯示側邊面板或 modal：

- **預設載入該點位的最新一筆調查日期**。
- 提供下拉選單可切換至任何一筆歷史調查日期（依日期新到舊排序）。
- 切換日期即重新渲染該次調查的所有欄位內容。
- 照片以縮圖網格呈現，點擊開啟燈箱（支援鍵盤左右切換、Esc 關閉）。
- 該點位若無任何資料，顯示明確的空狀態，而非空白或錯誤。

---

## 三、技術規格

- **技術棧**：Vite + TypeScript + Leaflet。不使用 React/Vue 等重型框架，除非你提出充分理由並經確認。
- **部署**：GitHub Actions build → GitHub Pages。設定正確的 `base` path。
- **無後端**：所有執行期邏輯在瀏覽器端；所有需要憑證的工作在 GitHub Actions 內完成。
- **相容性**：Chrome / Safari / Firefox 最新兩個版本，需支援手機與平板觸控操作。除了電腦也要同步支援手機介面
- **無障礙**：標記點需可用鍵盤 Tab 聚焦與 Enter 開啟，具備適當 ARIA 標籤，色彩對比符合 WCAG AA。
- **語系**：介面文字為繁體中文（台灣）。日期格式使用 `YYYY-MM-DD`。
- **設計調性**：這是政府單位的公開科學資料網站。乾淨、專業、可信、資訊密度適中。避免過度裝飾與花俏動畫。

---

## 四、執行計畫

### Phase 0 — 釐清與確認（**先做這步，不要直接開始寫程式**）

1. 向使用者確認下方「待補資訊」中所有未知項目。
2. **特別注意**：使用者提供的兩個試算表連結是同一個檔案 ID，只有網址結尾的 gid 不同（1951475389 / 1951475388）。點位 6–10 的試算表極可能是另一個獨立檔案，請務必取得正確網址。
3. 你無法登入 Google 讀取試算表。請請使用者匯出一份 CSV 樣本，或直接貼上「表單回覆 1」的完整標題列與 2–3 筆範例資料。
4. 確認「調查日期」是表單中的獨立欄位，還是只能依賴自動產生的時間戳記。
5. 確認 Drive「檔案回應」資料夾的分享權限現況。
6. 產出並經使用者確認 `docs/DATA_CONTRACT.md`：試算表欄位 → JSON 欄位的完整對應表。

### Phase 1 — 專案骨架

Vite + TS 專案、目錄結構、`data/` 的樣本 fixture（可先手工造假資料）、GitHub Pages 部署 workflow 跑通。

### Phase 2 — 地圖核心

Leaflet CRS.Simple 底圖渲染、編號標記渲染、pan/zoom、maxBounds。**此階段結束時務必實測：在多種視窗尺寸與縮放層級下，標記與底圖的相對位置完全不動。**

### Phase 3 — 資料層

Sheets API 抓取腳本、正規化、schema 驗證、Drive 網址解析與轉換、GitHub Actions 排程串接。

### Phase 4 — 檢視介面

點位面板、日期選單、欄位渲染、照片網格與燈箱、空狀態與載入狀態。

### Phase 5 — 管理者編輯器

`admin.html`、底圖上傳、標記新增／刪除／拖曳、JSON 匯出、（選用）GitHub API 寫回。

### Phase 6 — 打磨與交付

行動裝置適配、無障礙檢查、錯誤處理、效能（照片 lazy load）、`README.md`（含：如何更新底圖、如何調整欄位對應、如何設定 Service Account、如何處理 Drive 權限、真正權限控管的升級路徑）。

**每個 Phase 完成後停下來，向使用者展示成果並取得確認後再繼續。**

---

## 五、資料模型（建議，請於 Phase 0 與使用者共同定案）

```jsonc
// data/markers.json — 標記設定，由管理者編輯器產出
{
  "basemap": {
    "src": "assets/basemap.png",
    "width": 2400,          // 原始像素寬
    "height": 1600          // 原始像素高
  },
  "markers": [
    { "pointId": 1, "label": "1", "x": 412.5, "y": 890.0 }
  ]
}
```

```jsonc
// data/surveys.json — 調查資料，由 GitHub Actions 自試算表產出
{
  "generatedAt": "2026-07-22T02:00:00Z",
  "points": [
    {
      "pointId": 1,
      "name": "點位1",
      "surveys": [
        {
          "date": "2026-07-15",
          "submittedAt": "2026-07-15T09:31:00+08:00",
          "fields": { /* 依 DATA_CONTRACT 定義的欄位 */ },
          "photos": [
            { "fileId": "1AbC...", "thumb": "https://...", "full": "https://..." }
          ]
        }
      ]
    }
  ]
}
```

---

## 六、驗收標準

- [ ] 在 320px 至 2560px 寬的各種視窗下，標記與底圖的相對位置完全不變。
- [ ] 觸控裝置上可正常平移與雙指縮放。
- [ ] 點擊標記預設顯示最新日期，切換歷史日期後內容正確更新。
- [ ] 單一儲存格中的多個 Drive 網址都能各自解析並顯示。
- [ ] 照片載入失敗時有明確的 fallback 或佔位提示，不出現破圖 icon。
- [ ] GitHub Actions 手動觸發後，網站資料在數分鐘內更新完成。
- [ ] 試算表欄位變動時，workflow 以清楚的錯誤訊息失敗，而非靜默產出壞資料。
- [ ] 管理者拖曳標記後匯出的 JSON，能被前台正確載入並還原位置。
- [ ] 任何憑證都未出現在 repo 或前端 bundle 中。

---

## 七、待補資訊（請先確認）

| 項目 | 現況 | 需要 |
|---|---|---|
| 試算表 A（點位 1–5） | `https://docs.google.com/spreadsheets/d/11nK0JFMwwIZsVBuKBABT2tUYQrXZ0WDAdJCO6ykZyXA/` gid `1951475389` | 確認 gid 是否正確指向「表單回覆 1」 |
| 試算表 B（點位 6–10） | `https://docs.google.com/spreadsheets/d/14x231YSCjzfFMD-RpG9vTieBFPWcPc8uXkYE7j2iBxg/edit?gid=629196421#gid=629196421` | 確認 gid 是否正確指向「表單回覆 1」 |
| 表單 A（點位 1–5） | `https://docs.google.com/forms/d/e/1FAIpQLSceRCt3AC3sRk8qAplqLPGIlgNSRLYpVhHJPeV5k-tqgC2HMg/viewform` | — |
| 表單 B（點位 6–10） | `https://docs.google.com/forms/d/e/1FAIpQLSdJ7H579nsLVJSkELIqQs6WkJLy5HvvQGBchdcstEACeOLn-A/viewform` | — |
| 欄位結構 | 未知 | CSV 樣本或完整標題列 |
| 調查日期欄位 | 未知 | 是獨立欄位或僅有時間戳記 |
| 點位編號辨識方式 | 未知 | 試算表中以哪個欄位標示點位 1–10 |
| Drive 照片權限 | 未知 | 「檔案回應」資料夾是否已設為公開可檢視 |
| 底圖檔案 | 未提供 | 影像檔與原始尺寸 |
| GitHub repo | 未提供 | repo 名稱與是否使用自訂網域 |

---

## 八、行為準則

- 遇到規格不明確時，**提問，不要臆測**。這是政府公開資料專案，資料正確性優先於開發速度。
- 若你認為某個需求有更好的實作方式，請說明理由與取捨後再動手，不要逕自更換方案。
- 程式碼註解與提交訊息使用繁體中文或英文皆可，但需保持一致。
- 不要為了展示功能而加入使用者沒要求的東西。
