// 前台進入點：載入資料、建立地圖、渲染標記、點擊開啟點位面板
import './styles/main.css'
import 'leaflet/dist/leaflet.css'
import './styles/map.css'
import './styles/panel.css'
import { createMap } from './map/createMap'
import { renderMarkers, type MarkerLayer } from './map/markers'
import { createPanel } from './panel/surveyPanel'
import { loadJson } from './data/loadData'
import { isLocalhost } from './env'
import type { MarkersJson, SurveysJson } from './data/types'

async function boot() {
  // 管理者入口僅在本機顯示（公開部署上維持隱藏）
  if (isLocalhost()) document.getElementById('admin-link')?.removeAttribute('hidden')

  const loading = document.getElementById('map-loading')
  try {
    const [markersData, surveysData] = await Promise.all([
      loadJson<MarkersJson>('data/markers.json'),
      loadJson<SurveysJson>('data/surveys.json'),
    ])

    const ctx = createMap('map', markersData)
    const panelEl = document.getElementById('panel')!

    let layer: MarkerLayer
    const panel = createPanel(panelEl, () => layer.select(null))
    layer = renderMarkers(ctx, markersData.markers, (pointId) => {
      layer.select(pointId)
      panel.open(
        surveysData.points.find((p) => p.pointId === pointId),
        pointId,
      )
    })

    loading?.remove()
  } catch (e) {
    console.error(e)
    if (loading) loading.textContent = '資料載入失敗，請重新整理頁面。'
  }
}

boot()
