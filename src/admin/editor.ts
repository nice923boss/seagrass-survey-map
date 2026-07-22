// 管理者標記編輯器：底圖上傳、標記新增/刪除/拖曳、匯出 markers.json、選用 GitHub 寫回。
import L from 'leaflet'
import type { MarkersJson, MarkerConfig } from '../data/types'
import { createMap, latLngToPx, pxToLatLng, type MapContext } from '../map/createMap'
import { numberIcon } from '../map/markers'
import { loadJson } from '../data/loadData'
import { commitFile } from './github'

const MAX_ID = 10

interface EditorBasemap {
  src: string // 匯出用的相對路徑（例：assets/basemap.png）
  previewUrl: string // 地圖實際載入的網址（相對 base 或 data URL）
  width: number
  height: number
}

export async function initEditor(mapId: string, controls: HTMLElement): Promise<void> {
  let data: MarkersJson
  try {
    data = await loadJson<MarkersJson>('data/markers.json')
  } catch {
    data = {
      basemap: { src: 'assets/basemap-placeholder.svg', width: 2400, height: 1600 },
      markers: [],
    }
  }

  const basemap: EditorBasemap = {
    src: data.basemap.src,
    previewUrl: import.meta.env.BASE_URL + data.basemap.src,
    width: data.basemap.width,
    height: data.basemap.height,
  }
  const markers: MarkerConfig[] = data.markers.map((m) => ({ ...m }))
  const handles = new Map<number, L.Marker>()
  let ctx: MapContext | null = null

  controls.innerHTML = `
    <section class="ed__block">
      <h2>底圖</h2>
      <input type="file" accept="image/*" id="ed-upload" />
      <p class="ed__hint">目前：<code id="ed-src"></code><br /><span id="ed-size"></span></p>
      <p class="ed__note" id="ed-note" hidden>
        已套用預覽。匯出後，請把這張圖檔放到 <code>public/assets/</code>，並確認檔名與匯出的 src 一致。
      </p>
    </section>
    <section class="ed__block">
      <h2>標記 <span id="ed-count" class="ed__count"></span></h2>
      <div class="ed__add">
        <label>編號 <select id="ed-new-id"></select></label>
        <button type="button" id="ed-add">新增標記</button>
      </div>
      <ul class="ed__list" id="ed-list"></ul>
      <p class="ed__hint">拖曳地圖上的標記即可移動，座標即時更新。</p>
    </section>
    <section class="ed__block">
      <button type="button" id="ed-export" class="ed__primary">匯出 markers.json</button>
    </section>
    <section class="ed__block">
      <details class="ed__gh">
        <summary>進階：直接寫回 GitHub（選用）</summary>
        <p class="ed__warn">
          個人存取權杖（PAT）會存在此瀏覽器的 localStorage，任何能操作此電腦的人都可讀取。
          這不是安全機制，僅為操作便利。共用電腦請勿使用，用完請清除。
        </p>
        <label class="ed__f">Owner <input id="gh-owner" placeholder="使用者或組織" /></label>
        <label class="ed__f">Repo <input id="gh-repo" placeholder="儲存庫名稱" /></label>
        <label class="ed__f">Branch <input id="gh-branch" value="main" /></label>
        <label class="ed__f">Path <input id="gh-path" value="public/data/markers.json" /></label>
        <label class="ed__f">Token <input id="gh-token" type="password" placeholder="ghp_..." /></label>
        <label class="ed__chk"><input type="checkbox" id="gh-remember" /> 記住權杖於此瀏覽器</label>
        <button type="button" id="gh-commit" class="ed__primary">提交到 GitHub</button>
        <p id="gh-status" class="ed__status" aria-live="polite"></p>
      </details>
    </section>
  `

  const $ = <T extends HTMLElement>(sel: string) => controls.querySelector(sel) as T
  const srcEl = $('#ed-src')
  const sizeEl = $('#ed-size')
  const noteEl = $<HTMLParagraphElement>('#ed-note')
  const listEl = $<HTMLUListElement>('#ed-list')
  const countEl = $('#ed-count')
  const newIdSel = $<HTMLSelectElement>('#ed-new-id')

  function buildMap() {
    if (ctx) ctx.map.remove()
    ctx = createMap(mapId, {
      basemap: { src: basemap.previewUrl, width: basemap.width, height: basemap.height },
      markers: [],
    })
    handles.clear()
    for (const cfg of markers) addMarkerToMap(cfg)
  }

  function addMarkerToMap(cfg: MarkerConfig) {
    const map = ctx!.map
    const marker = L.marker(pxToLatLng(cfg.x, cfg.y, basemap.height), {
      icon: numberIcon(cfg.label),
      draggable: true,
      autoPan: true,
    })
    marker.addTo(map)
    marker.on('drag', () => {
      const px = latLngToPx(marker.getLatLng(), basemap.height)
      cfg.x = Math.round(px.x)
      cfg.y = Math.round(px.y)
      updateRow(cfg.pointId)
    })
    marker.on('dragend', renderList)
    handles.set(cfg.pointId, marker)
  }

  function usedIds(): Set<number> {
    return new Set(markers.map((m) => m.pointId))
  }

  function renderList() {
    const used = usedIds()
    countEl.textContent = `（共 ${markers.length} 個）`

    // 可新增的編號
    newIdSel.innerHTML = ''
    const available: number[] = []
    for (let i = 1; i <= MAX_ID; i++) if (!used.has(i)) available.push(i)
    for (const i of available) {
      const opt = document.createElement('option')
      opt.value = String(i)
      opt.textContent = String(i)
      newIdSel.appendChild(opt)
    }
    $<HTMLButtonElement>('#ed-add').disabled = available.length === 0

    // 標記列表
    listEl.innerHTML = ''
    for (const cfg of [...markers].sort((a, b) => a.pointId - b.pointId)) {
      const li = document.createElement('li')
      li.className = 'ed__item'
      li.dataset.id = String(cfg.pointId)
      li.innerHTML =
        `<span class="ed__badge">${cfg.label}</span>` +
        `<span class="ed__coord">(${cfg.x}, ${cfg.y})</span>` +
        `<button type="button" class="ed__mini" data-act="focus">定位</button>` +
        `<button type="button" class="ed__mini ed__mini--del" data-act="del">刪除</button>`
      listEl.appendChild(li)
    }
  }

  function updateRow(id: number) {
    const li = listEl.querySelector(`li[data-id="${id}"] .ed__coord`)
    const cfg = markers.find((m) => m.pointId === id)
    if (li && cfg) li.textContent = `(${cfg.x}, ${cfg.y})`
  }

  function refreshBasemapInfo() {
    srcEl.textContent = basemap.src
    sizeEl.textContent = `${basemap.width} × ${basemap.height} 像素`
  }

  function addMarker(pointId: number) {
    const cfg: MarkerConfig = {
      pointId,
      label: String(pointId),
      x: Math.round(basemap.width / 2),
      y: Math.round(basemap.height / 2),
    }
    markers.push(cfg)
    addMarkerToMap(cfg)
    renderList()
  }

  function removeMarker(pointId: number) {
    handles.get(pointId)?.remove()
    handles.delete(pointId)
    const idx = markers.findIndex((m) => m.pointId === pointId)
    if (idx >= 0) markers.splice(idx, 1)
    renderList()
  }

  function focusMarker(pointId: number) {
    const m = handles.get(pointId)
    if (m && ctx) ctx.map.panTo(m.getLatLng())
  }

  function toJsonString(): string {
    const out: MarkersJson = {
      basemap: { src: basemap.src, width: basemap.width, height: basemap.height },
      markers: [...markers].sort((a, b) => a.pointId - b.pointId),
    }
    return JSON.stringify(out, null, 2)
  }

  // ---- 事件 ----
  $('#ed-upload').addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        basemap.previewUrl = dataUrl
        basemap.src = `assets/${file.name}`
        basemap.width = img.naturalWidth
        basemap.height = img.naturalHeight
        noteEl.hidden = false
        refreshBasemapInfo()
        buildMap()
        renderList()
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })

  $('#ed-add').addEventListener('click', () => {
    const id = Number(newIdSel.value)
    if (id) addMarker(id)
  })

  listEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button')
    if (!btn) return
    const id = Number((btn.closest('li') as HTMLElement).dataset.id)
    if (btn.dataset.act === 'del') removeMarker(id)
    else if (btn.dataset.act === 'focus') focusMarker(id)
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

  // ---- GitHub 寫回 ----
  const ghFields = ['owner', 'repo', 'branch', 'path'] as const
  const savedCfg = JSON.parse(localStorage.getItem('gh-config') ?? '{}') as Record<string, string>
  for (const f of ghFields) {
    const input = $<HTMLInputElement>(`#gh-${f}`)
    if (savedCfg[f]) input.value = savedCfg[f]
  }
  const savedToken = localStorage.getItem('gh-token')
  if (savedToken) {
    $<HTMLInputElement>('#gh-token').value = savedToken
    $<HTMLInputElement>('#gh-remember').checked = true
  }

  $('#gh-commit').addEventListener('click', async () => {
    const status = $('#gh-status')
    const get = (f: string) => $<HTMLInputElement>(`#gh-${f}`).value.trim()
    const owner = get('owner')
    const repo = get('repo')
    const branch = get('branch') || 'main'
    const path = get('path') || 'public/data/markers.json'
    const token = get('token')
    if (!owner || !repo || !token) {
      status.textContent = '請填寫 owner、repo 與 token。'
      status.className = 'ed__status ed__status--err'
      return
    }
    // 儲存設定（token 僅在勾選時儲存）
    localStorage.setItem('gh-config', JSON.stringify({ owner, repo, branch, path }))
    if ($<HTMLInputElement>('#gh-remember').checked) localStorage.setItem('gh-token', token)
    else localStorage.removeItem('gh-token')

    status.textContent = '提交中……'
    status.className = 'ed__status'
    try {
      const url = await commitFile({
        token,
        owner,
        repo,
        branch,
        path,
        content: toJsonString(),
        message: '更新 markers.json（管理者編輯器）',
      })
      status.textContent = `提交成功：${url}`
      status.className = 'ed__status ed__status--ok'
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : '提交失敗'
      status.className = 'ed__status ed__status--err'
    }
  })

  refreshBasemapInfo()
  buildMap()
  renderList()
}
