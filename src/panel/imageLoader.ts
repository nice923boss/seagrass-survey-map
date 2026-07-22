// Drive 圖片載入器：延遲載入（IntersectionObserver）＋併發限制＋限流重試。
//
// Google 對圖片大量並發請求會限流（回應失敗，稍後恢復）。此模組：
//   1. 只在縮圖接近視窗時才載入（減少同時請求量）。
//   2. 全域同時載入數上限，其餘排隊。
//   3. 失敗時延遲重試數次（涵蓋限流的暫時性失敗），用盡才回報失敗。

const MAX_CONCURRENT = 3
const RETRIES = 4

let active = 0
const waiting: Array<() => void> = []
const onFailMap = new WeakMap<HTMLImageElement, () => void>()

function pump() {
  while (active < MAX_CONCURRENT && waiting.length > 0) {
    const task = waiting.shift()!
    active++
    task()
  }
}

function schedule(task: () => void) {
  waiting.push(task)
  pump()
}

function release() {
  active = Math.max(0, active - 1)
  pump()
}

function attempt(img: HTMLImageElement, url: string, left: number) {
  img.onload = () => {
    img.classList.add('is-loaded')
    release()
  }
  img.onerror = () => {
    release()
    if (left > 0) {
      // 延遲遞增 + 抖動，避開限流尖峰
      const delay = (RETRIES - left + 1) * 2000 + Math.random() * 1200
      setTimeout(() => schedule(() => attempt(img, url, left - 1)), delay)
    } else {
      onFailMap.get(img)?.()
    }
  }
  img.src = url
}

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const img = e.target as HTMLImageElement
      io.unobserve(img)
      const url = img.dataset.src
      if (url) schedule(() => attempt(img, url, RETRIES))
    }
  },
  { rootMargin: '300px' },
)

/** 註冊一張延遲載入的圖：進入視窗附近才載入，失敗重試，用盡則呼叫 onFail。 */
export function lazyLoadImage(img: HTMLImageElement, url: string, onFail: () => void): void {
  img.dataset.src = url
  onFailMap.set(img, onFail)
  io.observe(img)
}
