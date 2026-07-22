// 照片燈箱：大圖檢視，鍵盤左右切換、Esc 關閉。全站單例。
// 大圖採三段 fallback：full（lh3 大圖）→ thumb（小圖）→ Drive 檢視連結。
import type { Photo } from '../data/types'
import { driveViewUrl } from '../data/drivePhotos'
import { resolveMediaUrl } from '../data/loadData'

let overlay: HTMLElement | null = null
let photos: Photo[] = []
let index = 0

function ensure(): HTMLElement {
  if (overlay) return overlay
  const el = document.createElement('div')
  el.className = 'lightbox'
  el.hidden = true
  el.innerHTML =
    `<button class="lightbox__close" type="button" aria-label="關閉">×</button>` +
    `<button class="lightbox__nav lightbox__prev" type="button" aria-label="上一張">‹</button>` +
    `<div class="lightbox__stage">` +
    `<img class="lightbox__img" alt="調查照片" />` +
    `<a class="lightbox__fallback" target="_blank" rel="noopener" hidden>照片載入失敗，點此在 Drive 開啟</a>` +
    `</div>` +
    `<button class="lightbox__nav lightbox__next" type="button" aria-label="下一張">›</button>` +
    `<div class="lightbox__count" aria-live="polite"></div>`
  document.body.appendChild(el)
  el.querySelector('.lightbox__close')!.addEventListener('click', close)
  el.querySelector('.lightbox__prev')!.addEventListener('click', () => step(-1))
  el.querySelector('.lightbox__next')!.addEventListener('click', () => step(1))
  el.addEventListener('click', (e) => {
    if (e.target === el) close()
  })
  document.addEventListener('keydown', onKey)
  overlay = el
  return el
}

function onKey(e: KeyboardEvent) {
  if (!overlay || overlay.hidden) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

function render() {
  const el = ensure()
  const img = el.querySelector('.lightbox__img') as HTMLImageElement
  const fallback = el.querySelector('.lightbox__fallback') as HTMLAnchorElement
  const photo = photos[index]

  fallback.hidden = true
  img.style.display = ''

  // full 失敗退 thumb，thumb 也失敗顯示 Drive 連結
  let stage = 0
  img.onerror = () => {
    stage++
    if (stage === 1) {
      img.src = resolveMediaUrl(photo.thumb)
    } else {
      img.onerror = null
      img.style.display = 'none'
      fallback.href = driveViewUrl(photo.fileId)
      fallback.hidden = false
    }
  }
  img.src = resolveMediaUrl(photo.full)

  el.querySelector('.lightbox__count')!.textContent = `${index + 1} / ${photos.length}`
  const multi = photos.length > 1
  ;(el.querySelector('.lightbox__prev') as HTMLElement).style.visibility = multi
    ? 'visible'
    : 'hidden'
  ;(el.querySelector('.lightbox__next') as HTMLElement).style.visibility = multi
    ? 'visible'
    : 'hidden'
}

function step(d: number) {
  if (!photos.length) return
  index = (index + d + photos.length) % photos.length
  render()
}

export function openLightbox(list: Photo[], start = 0) {
  if (!list.length) return
  photos = list
  index = start
  const el = ensure()
  el.hidden = false
  render()
}

function close() {
  if (overlay) overlay.hidden = true
}
