// 建立 Leaflet CRS.Simple 地圖，以底圖原始像素為座標系。
// 標記座標與縮放無關，天生穩定；maxBounds 防止把底圖拖出畫面。
import L from 'leaflet'
import type { MarkersJson } from '../data/types'

export interface MapContext {
  map: L.Map
  basemap: MarkersJson['basemap']
}

/** 底圖左上原點像素 (x, y) → CRS.Simple 的 LatLng（原點在左下，故 y 需翻轉） */
export function pxToLatLng(x: number, y: number, height: number): L.LatLngTuple {
  return [height - y, x]
}

/** LatLng → 底圖左上原點像素 (x, y)，供管理者拖曳時反算 */
export function latLngToPx(ll: L.LatLng, height: number): { x: number; y: number } {
  return { x: ll.lng, y: height - ll.lat }
}

export function createMap(containerId: string, markersData: MarkersJson): MapContext {
  const { basemap } = markersData
  const { width, height } = basemap
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [height, width],
  ]

  const map = L.map(containerId, {
    crs: L.CRS.Simple,
    minZoom: -4,
    maxZoom: 4,
    zoomSnap: 0.1,
    zoomControl: true,
    attributionControl: false,
    maxBoundsViscosity: 1.0, // 完全阻止拖出邊界
  })

  // 相對路徑補上 base；絕對網址、data/blob URL（admin 上傳預覽）直接使用
  const raw = basemap.src
  const imgUrl = /^(https?:|data:|blob:|\/)/.test(raw) ? raw : import.meta.env.BASE_URL + raw
  L.imageOverlay(imgUrl, bounds).addTo(map)
  map.fitBounds(bounds)
  map.setMaxBounds(bounds)

  // 容器尺寸變動（視窗縮放、旋轉）時重繪，標記與底圖相對位置保持不變
  const container = map.getContainer()
  const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }))
  ro.observe(container)
  map.on('unload', () => ro.disconnect())

  return { map, basemap }
}
