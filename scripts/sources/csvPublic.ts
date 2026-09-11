// 資料來源（預設）：公開試算表 CSV 匯出，零憑證。
import Papa from 'papaparse'

export interface SheetInput {
  name: string
  id: string
  gid: string
}

// 2026-09-11 起改讀客戶整理後的單一總表（點位 1-10 同一工作表），
// 原先的 A（點位1-5）、B（點位6-10）兩份試算表不再讀取。
export const SHEETS: SheetInput[] = [
  { name: '總表（點位1-10）', id: '1Um8gFK9OYXVnI_e7lYaJZdrlojfVwEKwsLpTeWDH5Qw', gid: '1951475389' },
]

export async function fetchCsvPublic(sheet: SheetInput): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheet.id}/export?format=csv&gid=${sheet.gid}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`抓取 ${sheet.name} 失敗：HTTP ${res.status}`)
  const text = await res.text()
  // 試算表非公開時 Google 會回登入頁 HTML
  if (text.trimStart().startsWith('<')) {
    throw new Error(`抓取 ${sheet.name} 得到 HTML 而非 CSV，試算表可能已改為非公開`)
  }
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false })
  return parsed.data
}
