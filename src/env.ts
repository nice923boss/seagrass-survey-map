/** 是否在本機開發環境（localhost / 127.0.0.1 / ::1）。
 *  管理者模式僅在本機顯示與啟用；公開部署（GitHub Pages）上隱藏。 */
export function isLocalhost(): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
}
