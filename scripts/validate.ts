// 資料驗證：任一列點位或日期無法解析即回報錯誤。errors 非空時 fetch 主流程中止（回傳非零）。
import { parsePointId, parseDate, parseTimestamp } from './normalize'

export interface NamedSheet {
  name: string
  rows: string[][]
}

export function validate(sheets: NamedSheet[]): string[] {
  const errors: string[] = []
  let total = 0

  for (const sheet of sheets) {
    const headers = sheet.rows[0] ?? []
    const pointIdx = headers.findIndex((h) => h.includes('調查點位'))
    const dateIdx = headers.findIndex((h) => h.includes('調查日期'))
    const tsIdx = headers.findIndex((h) => h.includes('時間戳記'))
    if (pointIdx < 0) {
      errors.push(`[${sheet.name}] 找不到「調查點位」欄`)
      continue
    }
    if (dateIdx < 0) {
      errors.push(`[${sheet.name}] 找不到「調查日期」欄`)
      continue
    }

    for (let r = 1; r < sheet.rows.length; r++) {
      const row = sheet.rows[r]
      if (!row || row.every((c) => !c || !c.trim())) continue // 空列
      total++
      const pRaw = (row[pointIdx] ?? '').trim()
      const dRaw = (row[dateIdx] ?? '').trim()

      const pid = parsePointId(pRaw)
      if (pid == null || pid < 1 || pid > 10) {
        errors.push(`[${sheet.name}] 第 ${r + 1} 列點位無法解析或超出 1-10：「${pRaw}」`)
      }
      const tsDate = tsIdx >= 0 ? parseTimestamp((row[tsIdx] ?? '').trim()).slice(0, 10) : ''
      const effectiveDate = parseDate(dRaw) || tsDate
      if (!effectiveDate || Number.isNaN(Date.parse(effectiveDate))) {
        errors.push(
          `[${sheet.name}] 第 ${r + 1} 列日期無法解析（調查日期與時間戳記皆無效）：「${dRaw}」`,
        )
      }
    }
  }

  if (total === 0) errors.push('沒有任何有效資料列')
  return errors
}
