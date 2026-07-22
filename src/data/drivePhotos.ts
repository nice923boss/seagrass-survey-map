// Google Drive 照片網址解析與轉換（前端與腳本共用純函式）
import type { Photo } from './types'

/**
 * 從一段文字抽出所有 Drive file ID。
 * 涵蓋格式：
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/file/d/<ID>/view?usp=...
 *   https://drive.google.com/uc?id=<ID>
 *   https://drive.google.com/thumbnail?id=<ID>
 *   https://lh3.googleusercontent.com/d/<ID>
 * 同一儲存格可能以逗號、空白或換行分隔多個網址。
 */
const ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/g

export function extractFileIds(cell: string): string[] {
  if (!cell) return []
  const ids: string[] = []
  let m: RegExpExecArray | null
  ID_RE.lastIndex = 0
  while ((m = ID_RE.exec(cell)) !== null) {
    ids.push(m[1])
  }
  return [...new Set(ids)]
}

/** 縮圖網址（列表、網格用）。
 *  用 lh3 端點：drive.google.com/thumbnail 對表單「檔案回應」資料夾的圖常整批失效。
 *  小尺寸 w400 載入快、較不易觸發限流。 */
export function thumbUrl(id: string): string {
  return `https://lh3.googleusercontent.com/d/${id}=w400`
}

/** 大圖網址（燈箱用） */
export function fullUrl(id: string): string {
  return `https://lh3.googleusercontent.com/d/${id}=w1600`
}

/** Drive 檢視頁：圖片載入失敗時的備援連結，使用者仍可開啟原圖 */
export function driveViewUrl(id: string): string {
  return `https://drive.google.com/file/d/${id}/view`
}

/** 將儲存格文字轉為照片陣列 */
export function toPhotos(cell: string): Photo[] {
  return extractFileIds(cell).map((id) => ({
    fileId: id,
    thumb: thumbUrl(id),
    full: fullUrl(id),
  }))
}
