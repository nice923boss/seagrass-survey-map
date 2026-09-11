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
    minZoom: -4, // 建立後改為動態的「鋪滿」縮放，見 fitCover
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
  map.setMaxBounds(bounds)

  const container = map.getContainer()
  const hasSize = () => container.clientWidth > 0 && container.clientHeight > 0

  // 最小縮放 = 底圖剛好鋪滿容器（寬、高取需求較大者），縮到底也不會露出底圖旁的空白。
  // CRS.Simple 在縮放 z 時 1 個底圖像素 = 2^z 個螢幕像素。
  const coverZoom = () =>
    Math.max(
      Math.log2(container.clientWidth / width),
      Math.log2(container.clientHeight / height),
    )
  const fitCover = () => {
    const z = coverZoom()
    map.setMinZoom(z)
    map.setView([height / 2, width / 2], z, { animate: false })
  }

  let fitted = hasSize()
  if (fitted) fitCover()

  // 容器尺寸變動（視窗縮放、旋轉）時重繪並更新最小縮放（低於新下限時 Leaflet 會自動拉回）。
  // 若建立當下容器尚無尺寸（隱藏分頁、尚未排版），在容器第一次有尺寸時再 fit 一次。
  const ro = new ResizeObserver(() => {
    map.invalidateSize({ animate: false })
    if (!hasSize()) return
    if (!fitted) {
      fitted = true
      fitCover()
    } else {
      map.setMinZoom(coverZoom())
    }
  })
  ro.observe(container)
  map.on('unload', () => ro.disconnect())

  return { map, basemap }
}
