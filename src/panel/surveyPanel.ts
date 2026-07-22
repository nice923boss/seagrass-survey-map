// 點位側邊面板：日期下拉（新到舊）、分區欄位渲染、照片群組、空狀態。
import type { PointData, SurveyRecord } from '../data/types'
import { renderPhotoGroup } from './photoGrid'

export interface Panel {
  open(point: PointData | undefined, pointId: number): void
  close(): void
}

export function createPanel(el: HTMLElement, onClose: () => void): Panel {
  function close() {
    el.hidden = true
    el.innerHTML = ''
    onClose()
  }

  function renderSurvey(body: HTMLElement, s: SurveyRecord) {
    body.innerHTML = ''

    const who = [s.surveyor && `調查：${s.surveyor}`, s.recorder && `記錄：${s.recorder}`]
      .filter(Boolean)
      .join('　')
    if (who) {
      const whoEl = document.createElement('div')
      whoEl.className = 'panel__who'
      whoEl.textContent = who
      body.appendChild(whoEl)
    }

    for (const sec of s.sections) {
      const secEl = document.createElement('section')
      secEl.className = 'survey-section'
      const h = document.createElement('h3')
      h.textContent = sec.title
      secEl.appendChild(h)
      const dl = document.createElement('dl')
      dl.className = 'field-list'
      for (const f of sec.fields) {
        const dt = document.createElement('dt')
        dt.textContent = f.label
        const dd = document.createElement('dd')
        dd.textContent = f.value
        dl.append(dt, dd)
      }
      secEl.appendChild(dl)
      body.appendChild(secEl)
    }

    for (const g of s.photoGroups) {
      body.appendChild(renderPhotoGroup(g))
    }
  }

  function open(point: PointData | undefined, pointId: number) {
    el.innerHTML = ''
    el.hidden = false

    const head = document.createElement('div')
    head.className = 'panel__head'
    const title = document.createElement('h2')
    title.textContent = point ? point.name : `點位${pointId}`
    const closeBtn = document.createElement('button')
    closeBtn.className = 'panel__close'
    closeBtn.type = 'button'
    closeBtn.setAttribute('aria-label', '關閉面板')
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', close)
    head.append(title, closeBtn)
    el.appendChild(head)

    if (!point || point.surveys.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'panel__empty'
      empty.textContent = '此點位目前沒有調查資料。'
      el.appendChild(empty)
      return
    }

    const surveys = point.surveys
    const dateCount = new Map<string, number>()
    surveys.forEach((s) => dateCount.set(s.date, (dateCount.get(s.date) ?? 0) + 1))

    const meta = document.createElement('div')
    meta.className = 'panel__meta'
    const label = document.createElement('label')
    label.className = 'panel__date-label'
    label.textContent = '調查日期'
    const select = document.createElement('select')
    select.className = 'panel__date-select'
    surveys.forEach((s, i) => {
      const opt = document.createElement('option')
      opt.value = String(i)
      // 同日期多筆時附記錄人員以區分
      opt.textContent =
        (dateCount.get(s.date) ?? 0) > 1 && s.recorder ? `${s.date}（${s.recorder}）` : s.date
      select.appendChild(opt)
    })
    label.appendChild(select)
    meta.appendChild(label)
    el.appendChild(meta)

    const body = document.createElement('div')
    body.className = 'panel__body'
    el.appendChild(body)

    select.addEventListener('change', () => renderSurvey(body, surveys[Number(select.value)]))
    renderSurvey(body, surveys[0]) // 預設最新
  }

  return { open, close }
}
