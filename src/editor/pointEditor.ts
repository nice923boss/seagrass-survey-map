// 專員點位編輯器：載入 markers.json、拖曳標記、一鍵儲存回 GitHub（觸發重新部署）。
// 與 admin/editor.ts 的差異：不換底圖、不增刪標記、不需輸入權杖（權杖於 build 時注入）。
import L from 'leaflet'
import type { MarkersJson, MarkerConfig } from '../data/types'
import { createMap, latLngToPx, pxToLatLng } from '../map/createMap'
import { numberIcon } from '../map/markers'
import { loadJson } from '../data/loadData'
import { commitFile } from '../admin/github'

// build 時由 GitHub Actions 注入（deploy.yml）。本機 dev 未設定時只能匯出檔案。
const TOKEN = (import.meta.env.VITE_EDITOR_GITHUB_TOKEN as string | undefined) ?? ''
const REPO = (import.meta.env.VITE_EDITOR_REPO as string | undefined) ?? '' // owner/repo

export async function initPointEditor(mapId: string, controls: HTMLElement): Promise<void> {
  const data = await loadJson<MarkersJson>('data/markers.json')
  const original = JSON.stringify(data.markers)
  const markers: MarkerConfig[] = data.markers.map((m) => ({ ...m }))
  const handles = new Map<number, L.Marker>()
  const canSave = Boolean(TOKEN && REPO.includes('/'))

  controls.innerHTML = `
    <section class="ed__block">
      <h2>操作說明</h2>
      <p class="ed__hint">
        直接在地圖上拖曳編號標記到正確位置，再按「儲存到網站」。
        儲存後網站約 1 至 2 分鐘完成更新，重新整理前台即可看到。
      </p>
    </section>
    <section class="ed__block">
      <h2>點位座標</h2>
      <ul class="ed__list" id="ed-list"></ul>
    </section>
    <section class="ed__block">
      <button type="button" id="ed-save" class="ed__primary">儲存到網站</button>
      <button type="button" id="ed-reset" class="ed__mini ed__reset">還原為目前網站版本</button>
      <p id="ed-status" class="ed__status" aria-live="polite"></p>
    </section>
    <section class="ed__block" id="ed-export-block" hidden>
      <p class="ed__note">此環境未設定儲存權杖，只能匯出檔案交由管理者更新。</p>
      <button type="button" id="ed-export" class="ed__mini">匯出 markers.json</button>
    </section>
  `

  const $ = <T extends HTMLElement>(sel: string) => controls.querySelector(sel) as T
  const listEl = $<HTMLUListElement>('#ed-list')
  const statusEl = $('#ed-status')
  const saveBtn = $<HTMLButtonElement>('#ed-save')

  const ctx = createMap(mapId, { basemap: data.basemap, markers: [] })

  function addMarkerToMap(cfg: MarkerConfig) {
    const marker = L.marker(pxToLatLng(cfg.x, cfg.y, data.basemap.height), {
      icon: numberIcon(cfg.label),
      draggable: true,
      autoPan: true,
      title: `點位 ${cfg.pointId}`,
    })
    marker.addTo(ctx.map)
    marker.on('drag', () => {
      const px = latLngToPx(marker.getLatLng(), data.basemap.height)
      cfg.x = Math.round(px.x)
      cfg.y = Math.round(px.y)
      updateRow(cfg.pointId)
    })
    marker.on('dragend', setDirty)
    handles.set(cfg.pointId, marker)
  }

  function renderList() {
    listEl.innerHTML = ''
    for (const cfg of [...markers].sort((a, b) => a.pointId - b.pointId)) {
      const li = document.createElement('li')
      li.className = 'ed__item'
      li.dataset.id = String(cfg.pointId)
      li.innerHTML =
        `<span class="ed__badge">${cfg.label}</span>` +
        `<span class="ed__coord">(${cfg.x}, ${cfg.y})</span>` +
        `<button type="button" class="ed__mini" data-act="focus">定位</button>`
      listEl.appendChild(li)
    }
  }

  function updateRow(id: number) {
    const el = listEl.querySelector(`li[data-id="${id}"] .ed__coord`)
    const cfg = markers.find((m) => m.pointId === id)
    if (el && cfg) el.textContent = `(${cfg.x}, ${cfg.y})`
  }

  function isDirty(): boolean {
    return JSON.stringify(markers) !== original
  }

  function setDirty() {
    statusEl.className = 'ed__status'
    statusEl.textContent = isDirty() ? '有未儲存的變更。' : ''
  }

  function toJsonString(): string {
    const out: MarkersJson = {
      basemap: data.basemap,
      markers: [...markers].sort((a, b) => a.pointId - b.pointId),
    }
    return JSON.stringify(out, null, 2) + '\n'
  }

  listEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn || btn.dataset.act !== 'focus') return
    const id = Number((btn.closest('li') as HTMLElement).dataset.id)
    const m = handles.get(id)
    if (m) ctx.map.panTo(m.getLatLng())
  })

  $('#ed-reset').addEventListener('click', () => {
    const orig = JSON.parse(original) as MarkerConfig[]
    for (const cfg of markers) {
      const o = orig.find((m) => m.pointId === cfg.pointId)
      if (!o) continue
      cfg.x = o.x
      cfg.y = o.y
      handles.get(cfg.pointId)?.setLatLng(pxToLatLng(cfg.x, cfg.y, data.basemap.height))
    }
    renderList()
    setDirty()
  })

  $('#ed-export').addEventListener('click', () => {
    const blob = new Blob([toJsonString()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'markers.json'
    a.click()
    URL.revokeObjectURL(url)
  })

  if (!canSave) {
    saveBtn.disabled = true
    $<HTMLElement>('#ed-export-block').hidden = false
  }

  saveBtn.addEventListener('click', async () => {
    if (!isDirty()) {
      statusEl.className = 'ed__status'
      statusEl.textContent = '座標沒有變更，不需儲存。'
      return
    }
    const [owner, repo] = REPO.split('/')
    saveBtn.disabled = true
    statusEl.className = 'ed__status'
    statusEl.textContent = '儲存中……'
    try {
      await commitFile({
        token: TOKEN,
        owner,
        repo,
        branch: 'main',
        path: 'public/data/markers.json',
        content: toJsonString(),
        message: 'chore: 專員更新點位座標',
      })
      statusEl.className = 'ed__status ed__status--ok'
      statusEl.textContent = '已儲存。網站約 1 至 2 分鐘後更新，請稍後重新整理前台確認。'
    } catch (err) {
      statusEl.className = 'ed__status ed__status--err'
      statusEl.textContent = `儲存失敗：${err instanceof Error ? err.message : '未知錯誤'}`
    } finally {
      saveBtn.disabled = false
    }
  })

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault()
  })

  for (const cfg of markers) addMarkerToMap(cfg)
  renderList()
}
