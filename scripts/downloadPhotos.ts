// 將 Drive 照片下載、壓縮成 webp（長邊 1600）存進 public/assets/photos/，
// 並把 surveys.json 內成功本地化的照片改指向本地路徑（徹底免除 Drive 限流）。
// 增量：已存在的檔案跳過，只抓新的。
import sharp from 'sharp'
import { mkdir, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SurveysJson } from '../src/data/types'
import { fullUrl } from '../src/data/drivePhotos'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const PHOTO_DIR = resolve(scriptDir, '../public/assets/photos')
const LOCAL_BASE = 'assets/photos'

const CONCURRENCY = 4
const RETRIES = 4

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 下載並壓縮單張。回傳是否成功（含既有檔案）。 */
async function downloadOne(fileId: string): Promise<boolean> {
  const out = resolve(PHOTO_DIR, `${fileId}.webp`)
  if (await exists(out)) return true

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(fullUrl(fileId))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await sharp(buf)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(out)
      return true
    } catch {
      if (attempt < RETRIES) await sleep((attempt + 1) * 2000 + Math.random() * 1000)
    }
  }
  return false
}

export async function downloadPhotos(json: SurveysJson): Promise<{ ok: number; fail: number }> {
  await mkdir(PHOTO_DIR, { recursive: true })

  const allPhotos = json.points.flatMap((p) =>
    p.surveys.flatMap((s) => s.photoGroups.flatMap((g) => g.photos)),
  )
  const uniqueIds = [...new Set(allPhotos.map((p) => p.fileId))]

  const successIds = new Set<string>()
  let ok = 0
  let fail = 0
  let idx = 0

  async function worker() {
    while (idx < uniqueIds.length) {
      const id = uniqueIds[idx++]
      const success = await downloadOne(id)
      if (success) {
        successIds.add(id)
        ok++
      } else {
        fail++
      }
      if ((ok + fail) % 20 === 0) console.log(`  進度 ${ok + fail}/${uniqueIds.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // 本地化成功者改指向本地 webp；失敗者保留 Drive 網址作為 fallback
  for (const p of allPhotos) {
    if (successIds.has(p.fileId)) {
      const local = `${LOCAL_BASE}/${p.fileId}.webp`
      p.thumb = local
      p.full = local
    }
  }

  return { ok, fail }
}
