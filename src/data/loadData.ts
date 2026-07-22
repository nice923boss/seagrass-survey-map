// 載入靜態 JSON（考量 GitHub Pages 的 base path）
export async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(import.meta.env.BASE_URL + path)
  if (!res.ok) throw new Error(`載入 ${path} 失敗：HTTP ${res.status}`)
  return (await res.json()) as T
}

/** 媒體路徑解析：本地相對路徑（下載進 repo 的照片）補 base；絕對網址（Drive fallback）原樣。 */
export function resolveMediaUrl(url: string): string {
  return /^https?:/.test(url) ? url : import.meta.env.BASE_URL + url
}
