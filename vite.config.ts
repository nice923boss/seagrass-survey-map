import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// 管理者頁預設不打包進 production build（公開部署上不存在 admin.html）。
// 本機開發（vite dev）不受此限，/admin.html 仍可正常訪問。
// 若確實要把 admin 一併部署，build 時設 VITE_INCLUDE_ADMIN=true。
const includeAdmin = process.env.VITE_INCLUDE_ADMIN === 'true'
const input: Record<string, string> = {
  main: fileURLToPath(new URL('./index.html', import.meta.url)),
}
if (includeAdmin) {
  input.admin = fileURLToPath(new URL('./admin.html', import.meta.url))
}

// GitHub Pages 需要正確的 base（/<repo-name>/）。
// 本機開發預設 '/'；部署時由 GitHub Actions 以環境變數 VITE_BASE 提供。
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    target: 'es2022',
    rollupOptions: { input },
  },
})
