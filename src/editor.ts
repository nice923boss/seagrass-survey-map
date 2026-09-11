// 專員模式進入點：不需登入，以難以猜測的網址作為入口，僅提供拖曳點位與儲存。
import './styles/main.css'
import 'leaflet/dist/leaflet.css'
import './styles/map.css'
import './styles/admin.css'
import { initPointEditor } from './editor/pointEditor'

const controls = document.getElementById('admin-controls')
if (controls) {
  initPointEditor('map', controls).catch((e) => {
    console.error(e)
    controls.textContent = '載入失敗，請重新整理頁面。'
  })
}
