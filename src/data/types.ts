// 全站共用型別定義（前端與抓取腳本共用）

/** 單張照片：Drive file ID 與兩種內嵌網址（互為 fallback） */
export interface Photo {
  fileId: string
  thumb: string // 縮圖：drive.google.com/thumbnail?id=...&sz=w800
  full: string // 大圖：lh3.googleusercontent.com/d/...=w2400
}

/** 一組照片（對應一個上傳欄位，例如「A 樣框海草照片」） */
export interface PhotoGroup {
  label: string
  photos: Photo[]
}

/** 一個欄位（原始中文欄名 + 值） */
export interface SurveyField {
  label: string
  value: string
}

/** 一個分區（例如「Ａ樣框覆蓋率」「水質」「水生物調查」） */
export interface SurveySection {
  title: string
  fields: SurveyField[]
}

/** 單筆調查記錄（試算表的一列） */
export interface SurveyRecord {
  date: string // 調查日期 YYYY-MM-DD
  submittedAt: string // 表單提交時間 ISO 8601（含 +08:00），供同日期排序
  surveyor: string // 調查人員
  recorder: string // 記錄人員
  sections: SurveySection[]
  photoGroups: PhotoGroup[]
}

/** 單一點位（含多筆歷史調查，依日期新到舊） */
export interface PointData {
  pointId: number // 1-10
  name: string // 「點位1」
  surveys: SurveyRecord[]
}

/** surveys.json 根結構 */
export interface SurveysJson {
  generatedAt: string // 產生時間 ISO 8601
  source: string // 資料來源：csvPublic | sheetsApi
  points: PointData[]
}

// ---- 標記設定（markers.json，由管理者編輯器產出） ----

export interface Basemap {
  src: string // 相對於網站 base 的底圖路徑
  width: number // 原始像素寬
  height: number // 原始像素高
}

export interface MarkerConfig {
  pointId: number // 1-10
  label: string // 顯示編號
  x: number // 底圖像素座標 X
  y: number // 底圖像素座標 Y
}

export interface MarkersJson {
  basemap: Basemap
  markers: MarkerConfig[]
}
