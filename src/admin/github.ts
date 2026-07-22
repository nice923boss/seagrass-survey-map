// GitHub REST API 寫回 markers.json（選用功能）。
// 重要：PAT 僅存於瀏覽器 localStorage，屬操作便利而非安全邊界。
export interface CommitOptions {
  token: string
  owner: string
  repo: string
  branch: string
  path: string
  content: string // 純文字，內部會轉 base64
  message: string
}

/** UTF-8 安全的 base64 編碼（btoa 不支援多位元組字元） */
function toBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export async function commitFile(o: CommitOptions): Promise<string> {
  const api = `https://api.github.com/repos/${o.owner}/${o.repo}/contents/${o.path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${o.token}`,
    Accept: 'application/vnd.github+json',
  }

  // 取現有檔案 sha（更新既有檔案時必填；不存在則為新增）
  let sha: string | undefined
  const getRes = await fetch(`${api}?ref=${encodeURIComponent(o.branch)}`, { headers })
  if (getRes.ok) {
    const j = (await getRes.json()) as { sha: string }
    sha = j.sha
  } else if (getRes.status !== 404) {
    throw new Error(`讀取現有檔案失敗：HTTP ${getRes.status}`)
  }

  const putRes = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: o.message,
      content: toBase64Utf8(o.content),
      branch: o.branch,
      sha,
    }),
  })
  if (!putRes.ok) {
    const t = await putRes.text()
    throw new Error(`寫回失敗：HTTP ${putRes.status}｜${t}`)
  }
  const result = (await putRes.json()) as { commit?: { html_url?: string } }
  return result.commit?.html_url ?? '提交成功'
}
