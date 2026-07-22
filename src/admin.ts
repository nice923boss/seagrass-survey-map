// 管理者進入點：標記編輯器
import './styles/main.css'
import 'leaflet/dist/leaflet.css'
import './styles/map.css'
import './styles/admin.css'
import { isLocalhost } from './env'
import { initEditor } from './admin/editor'

const controls = document.getElementById('admin-controls')
if (!isLocalhost()) {
  // 防呆：即使 admin.html 意外出現在公開部署，也不啟動編輯器
  const app = document.getElementById('admin-app')
  if (app) {
    app.innerHTML =
      '<p style="padding:48px 24px;text-align:center;color:#5c6b73;font-size:1rem;">' +
      '管理者模式僅在本機（localhost）開發環境使用，公開網站上不提供。</p>'
  }
} else if (controls) {
  initEditor('map', controls).catch((e) => console.error(e))
}
