// 編號標記渲染：SVG divIcon（縮放清晰）、hover/focus/selected 三態、鍵盤可操作。
import L from 'leaflet'
import type { MarkerConfig } from '../data/types'
import { pxToLatLng, type MapContext } from './createMap'

export function numberIcon(label: string): L.DivIcon {
  const fs = label.length > 1 ? 15 : 19
  return L.divIcon({
    className: 'pin',
    html:
      `<svg class="pin__svg" width="40" height="50" viewBox="0 0 40 50" aria-hidden="true">` +
      `<path class="pin__body" d="M20 49 C20 49 37 27 37 16 A17 17 0 1 0 3 16 C3 27 20 49 20 49 Z"/>` +
      `<text class="pin__num" x="20" y="16.5" text-anchor="middle" dominant-baseline="central" font-size="${fs}">${label}</text>` +
      `</svg>`,
    iconSize: [40, 50],
    iconAnchor: [20, 49], // 尖端指向點位
  })
}

export interface MarkerLayer {
  /** 設定選中的點位（null 表示取消選中） */
  select(pointId: number | null): void
  /** 將鍵盤焦點移到指定點位 */
  focus(pointId: number): void
}

export function renderMarkers(
  ctx: MapContext,
  markers: MarkerConfig[],
  onSelect: (pointId: number) => void,
): MarkerLayer {
  const handles = new Map<number, L.Marker>()
  const container = ctx.map.getContainer()

  for (const cfg of markers) {
    const marker = L.marker(pxToLatLng(cfg.x, cfg.y, ctx.basemap.height), {
      icon: numberIcon(cfg.label),
      keyboard: true, // 可 Tab 聚焦、Enter 觸發 click
      riseOnHover: true,
      title: `點位 ${cfg.pointId}`,
    })
    marker.addTo(ctx.map)
    marker.on('click', () => onSelect(cfg.pointId))

    const el = marker.getElement()
    if (el) {
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', `點位 ${cfg.pointId}`)
    }
    handles.set(cfg.pointId, marker)
  }

  function select(pointId: number | null) {
    handles.forEach((m, id) => {
      const el = m.getElement()
      if (!el) return
      const on = id === pointId
      el.classList.toggle('pin--selected', on)
      el.setAttribute('aria-pressed', String(on))
      m.setZIndexOffset(on ? 1000 : 0)
    })
    container.classList.toggle('has-selection', pointId != null)
  }

  function focus(pointId: number) {
    handles.get(pointId)?.getElement()?.focus()
  }

  return { select, focus }
}
