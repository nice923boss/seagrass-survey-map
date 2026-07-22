// 照片縮圖網格：延遲載入 + 限流重試（見 imageLoader），失敗改為可點開 Drive 的佔位。
import type { PhotoGroup } from '../data/types'
import { openLightbox } from './lightbox'
import { lazyLoadImage } from './imageLoader'
import { driveViewUrl } from '../data/drivePhotos'
import { resolveMediaUrl } from '../data/loadData'

export function renderPhotoGroup(group: PhotoGroup): HTMLElement {
  const wrap = document.createElement('section')
  wrap.className = 'photo-group'

  const h = document.createElement('h3')
  h.textContent = `${group.label}（${group.photos.length}）`
  wrap.appendChild(h)

  const grid = document.createElement('div')
  grid.className = 'photo-grid'

  group.photos.forEach((photo, i) => {
    const btn = document.createElement('button')
    btn.className = 'photo-thumb'
    btn.type = 'button'
    btn.setAttribute('aria-label', `${group.label} 第 ${i + 1} 張，點擊放大`)

    const img = document.createElement('img')
    img.alt = `${group.label} ${i + 1}`
    btn.appendChild(img)

    // 進入視窗附近才載入；重試用盡則換成 Drive 備援連結佔位
    lazyLoadImage(img, resolveMediaUrl(photo.thumb), () => {
      btn.replaceWith(brokenTile(group.label, i, photo.fileId))
    })

    btn.addEventListener('click', () => openLightbox(group.photos, i))
    grid.appendChild(btn)
  })

  wrap.appendChild(grid)
  return wrap
}

function brokenTile(label: string, i: number, fileId: string): HTMLElement {
  const a = document.createElement('a')
  a.className = 'photo-thumb photo-thumb--broken'
  a.href = driveViewUrl(fileId)
  a.target = '_blank'
  a.rel = 'noopener'
  a.setAttribute('aria-label', `${label} 第 ${i + 1} 張載入失敗，點擊在 Drive 開啟`)
  const span = document.createElement('span')
  span.innerHTML = '照片載入失敗<br />在 Drive 開啟'
  a.appendChild(span)
  return a
}
