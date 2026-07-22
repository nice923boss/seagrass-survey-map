// 將兩份試算表的原始列（string[][]，首列為表頭）正規化為統一的 SurveysJson。
// 分組規則見 docs/DATA_CONTRACT.md。
import type {
  SurveysJson,
  SurveyRecord,
  SurveySection,
  PhotoGroup,
  SurveyField,
  Photo,
} from '../src/data/types'
import { toPhotos } from '../src/data/drivePhotos'

// ---- 值的正規化 ----

/** 全形數字（０-９）轉半形 */
function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
}

/** 「點位１０」→ 10；無法解析回 null */
export function parsePointId(cell: string): number | null {
  const m = toHalfWidthDigits(cell).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

/** 「2026/4/11」→「2026-04-11」；無法解析回 null */
export function parseDate(cell: string): string | null {
  const m = cell.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** 「2026/4/11下午4:00:21」→「2026-04-11T16:00:21+08:00」；無法解析回空字串 */
export function parseTimestamp(cell: string): string {
  const m = cell
    .trim()
    .match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)?\s*(\d{1,2}):(\d{2}):(\d{2})/)
  if (!m) return ''
  const [, y, mo, d, ampm, h, mi, s] = m
  let hour = parseInt(h, 10)
  if (ampm === '下午' && hour < 12) hour += 12
  if (ampm === '上午' && hour === 12) hour = 0
  const p = (n: string) => n.padStart(2, '0')
  return `${y}-${p(mo)}-${p(d)}T${p(String(hour))}:${mi}:${s}+08:00`
}

// ---- 欄位分類 ----

type Bucket =
  | { kind: 'submittedAt' }
  | { kind: 'date' }
  | { kind: 'point' }
  | { kind: 'surveyor' }
  | { kind: 'recorder' }
  | { kind: 'photo'; label: string }
  | { kind: 'section'; title: string }
  | { kind: 'other' }

const SECTION_ORDER = [
  '基本資訊',
  'Ａ樣框覆蓋率',
  'Ｂ樣框覆蓋率',
  'Ｃ樣框覆蓋率',
  '整體觀察',
  '水質',
  '水生物調查',
  '植株與物候',
  '其他',
]
const PHOTO_ORDER = [
  'Ａ樣框照片',
  'Ｂ樣框照片',
  'Ｃ樣框照片',
  '水質照片',
  '水生物照片',
  '樣本照片',
  '其他照片',
]

function classify(header: string): Bucket {
  const h = header.trim()
  if (h.includes('時間戳記')) return { kind: 'submittedAt' }
  if (h.includes('調查日期')) return { kind: 'date' }
  if (h.includes('調查點位')) return { kind: 'point' }
  if (h.includes('調查人員')) return { kind: 'surveyor' }
  if (h.includes('記錄人員')) return { kind: 'recorder' }

  // 照片欄位需先於區塊判定（照片欄名也含「樣框」「水質」等）
  if (h.includes('照片') || h.includes('上傳')) {
    if (h.includes('樣框')) {
      // 照片欄的樣框字母半形（A/B）與全形（Ｃ）混用，需同時比對
      const f = /[ＡA]/.test(h) ? 'Ａ' : /[ＢB]/.test(h) ? 'Ｂ' : /[ＣC]/.test(h) ? 'Ｃ' : ''
      return { kind: 'photo', label: `${f}樣框照片` }
    }
    if (h.includes('水質')) return { kind: 'photo', label: '水質照片' }
    if (h.includes('水生物')) return { kind: 'photo', label: '水生物照片' }
    if (h.includes('樣本')) return { kind: 'photo', label: '樣本照片' }
    return { kind: 'photo', label: '其他照片' }
  }

  if (/天候狀況|潮汐|放網時間|點位調查時間/.test(h)) return { kind: 'section', title: '基本資訊' }
  if (h.includes('Ａ樣框')) return { kind: 'section', title: 'Ａ樣框覆蓋率' }
  if (h.includes('Ｂ樣框')) return { kind: 'section', title: 'Ｂ樣框覆蓋率' }
  if (h.includes('Ｃ樣框')) return { kind: 'section', title: 'Ｃ樣框覆蓋率' }
  if (h.includes('整體觀察')) return { kind: 'section', title: '整體觀察' }
  if (/水溫|鹽度|pH|亞硝酸|硝酸鹽|氨氮|水質採樣|底質採樣|水質狀況/.test(h))
    return { kind: 'section', title: '水質' }
  if (/傘籠|長城籠|水生物處理|補充紀錄/.test(h)) return { kind: 'section', title: '水生物調查' }
  if (/株數|葉長|庇護高度|物候/.test(h)) return { kind: 'section', title: '植株與物候' }
  return { kind: 'other' }
}

/** 清理欄名：取換行前主要部分、壓縮空白 */
function cleanLabel(header: string): string {
  return header.split('\n')[0].replace(/\s+/g, ' ').trim()
}

/** 樣框區塊內去掉重複的「Ａ樣框 -」前綴 */
function fieldLabel(header: string, sectionTitle: string): string {
  let l = cleanLabel(header)
  if (sectionTitle.includes('樣框')) l = l.replace(/^[ＡＢＣ]樣框\s*-?\s*/, '')
  return l
}

/** 每列解析結果（含原始點位儲存格供驗證回報） */
export interface ParsedRow {
  pointId: number | null
  rawPointCell: string
  record: SurveyRecord
}

/** 解析單一試算表的所有資料列 */
export function parseSheet(rows: string[][]): ParsedRow[] {
  const headers = rows[0] ?? []
  const out: ParsedRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.every((c) => !c || !c.trim())) continue // 空列

    let date = ''
    let submittedAt = ''
    let surveyor = ''
    let recorder = ''
    let rawPointCell = ''
    let pointId: number | null = null
    const sectionMap = new Map<string, SurveyField[]>()
    const photoMap = new Map<string, Photo[]>()

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c]
      const value = (row[c] ?? '').trim()
      const b = classify(header)
      switch (b.kind) {
        case 'submittedAt':
          submittedAt = parseTimestamp(value)
          break
        case 'date':
          date = parseDate(value) ?? ''
          break
        case 'point':
          rawPointCell = value
          pointId = parsePointId(value)
          break
        case 'surveyor':
          surveyor = value
          break
        case 'recorder':
          recorder = value
          break
        case 'photo': {
          if (!value) break
          const photos = toPhotos(value)
          if (photos.length) {
            const arr = photoMap.get(b.label) ?? []
            arr.push(...photos)
            photoMap.set(b.label, arr)
          }
          break
        }
        case 'section': {
          if (!value) break
          const arr = sectionMap.get(b.title) ?? []
          arr.push({ label: fieldLabel(header, b.title), value })
          sectionMap.set(b.title, arr)
          break
        }
        case 'other': {
          if (!value) break
          const arr = sectionMap.get('其他') ?? []
          arr.push({ label: cleanLabel(header), value })
          sectionMap.set('其他', arr)
          break
        }
      }
    }

    const sections: SurveySection[] = SECTION_ORDER.filter((t) => sectionMap.has(t)).map((t) => ({
      title: t,
      fields: sectionMap.get(t)!,
    }))
    // 已知 label 依 PHOTO_ORDER 排序，未列出的（意外 label）附在後面，不靜默丟棄
    const orderedLabels = [
      ...PHOTO_ORDER.filter((l) => photoMap.has(l)),
      ...[...photoMap.keys()].filter((l) => !PHOTO_ORDER.includes(l)),
    ]
    const photoGroups: PhotoGroup[] = orderedLabels.map((l) => ({
      label: l,
      photos: photoMap.get(l)!,
    }))

    // 調查日期漏填時，退回以時間戳記的日期為準
    if (!date && submittedAt) date = submittedAt.slice(0, 10)

    out.push({
      pointId,
      rawPointCell,
      record: { date, submittedAt, surveyor, recorder, sections, photoGroups },
    })
  }
  return out
}

/** 主正規化：多份試算表列 → SurveysJson。回傳 json 與未知欄位警告。 */
export function normalize(
  sheets: string[][][],
  source: string,
): { json: SurveysJson; warnings: string[] } {
  const parsed = sheets.flatMap((rows) => parseSheet(rows))

  const byPoint = new Map<number, SurveyRecord[]>()
  for (const p of parsed) {
    if (p.pointId == null) continue // 由 validate 攔截，這裡略過
    const arr = byPoint.get(p.pointId) ?? []
    arr.push(p.record)
    byPoint.set(p.pointId, arr)
  }

  const points = [...byPoint.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pointId, surveys]) => {
      surveys.sort(
        (a, b) => b.date.localeCompare(a.date) || b.submittedAt.localeCompare(a.submittedAt),
      )
      return { pointId, name: `點位${pointId}`, surveys }
    })

  // 未知欄位警告：出現在「其他」區塊的欄名
  const unknown = new Set<string>()
  for (const pt of points)
    for (const s of pt.surveys)
      for (const sec of s.sections)
        if (sec.title === '其他') for (const f of sec.fields) unknown.add(f.label)

  const warnings = unknown.size ? [`偵測到未分類欄位（歸入「其他」）：${[...unknown].join('、')}`] : []

  return {
    json: { generatedAt: new Date().toISOString(), source, points },
    warnings,
  }
}
