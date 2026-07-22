// 主流程：抓取兩份試算表 → 驗證 → 正規化 → 寫入 public/data/surveys.json
//
// 資料來源以環境變數 DATA_SOURCE 切換：
//   csvPublic（預設）：公開 CSV 匯出，零憑證。
//   sheetsApi：Service Account（需 GOOGLE_SERVICE_ACCOUNT_JSON）。
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { SHEETS, fetchCsvPublic } from './sources/csvPublic'
import { fetchSheetsApi } from './sources/sheetsApi'
import { validate, type NamedSheet } from './validate'
import { normalize } from './normalize'
import { downloadPhotos } from './downloadPhotos'

const SOURCE = process.env.DATA_SOURCE ?? 'csvPublic'
const scriptDir = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(scriptDir, '../public/data/surveys.json')

async function main() {
  console.log(`資料來源：${SOURCE}`)

  const named: NamedSheet[] = []
  for (const sheet of SHEETS) {
    const rows = SOURCE === 'sheetsApi' ? await fetchSheetsApi(sheet) : await fetchCsvPublic(sheet)
    console.log(`  ${sheet.name}：${Math.max(rows.length - 1, 0)} 筆`)
    named.push({ name: sheet.name, rows })
  }

  const errors = validate(named)
  if (errors.length) {
    console.error('資料驗證失敗：')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }

  const { json, warnings } = normalize(
    named.map((s) => s.rows),
    SOURCE,
  )
  for (const w of warnings) console.warn('警告：' + w)

  // 下載照片進 repo（預設啟用；設 DOWNLOAD_PHOTOS=false 可略過，開發時較快）
  if (process.env.DOWNLOAD_PHOTOS !== 'false') {
    console.log('下載照片並壓縮為 webp...')
    const stat = await downloadPhotos(json)
    console.log(`照片：本地化 ${stat.ok} 張，失敗 ${stat.fail} 張（失敗者保留 Drive 連結）`)
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(json, null, 2), 'utf8')

  const totalSurveys = json.points.reduce((n, p) => n + p.surveys.length, 0)
  console.log(`已寫入 ${OUT}`)
  console.log(`點位數：${json.points.length}，總調查筆數：${totalSurveys}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
