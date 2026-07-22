// 資料來源（預設）：公開試算表 CSV 匯出，零憑證。
import Papa from 'papaparse'

export interface SheetInput {
  name: string
  id: string
  gid: string
}

export const SHEETS: SheetInput[] = [
  { name: 'A（點位1-5）', id: '11nK0JFMwwIZsVBuKBABT2tUYQrXZ0WDAdJCO6ykZyXA', gid: '1951475389' },
  { name: 'B（點位6-10）', id: '14x231YSCjzfFMD-RpG9vTieBFPWcPc8uXkYE7j2iBxg', gid: '629196421' },
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
