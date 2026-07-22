// 資料來源（主方案，待啟用）：Google Service Account 唯讀讀取 Sheets API。
//
// 啟用方式：
//   1. 在 Google Cloud 建立 Service Account，啟用 Google Sheets API。
//   2. 將兩份試算表「共用」給該 Service Account 的 email（檢視者即可）。
//   3. 把金鑰 JSON 放進環境變數 GOOGLE_SERVICE_ACCOUNT_JSON（GitHub Secrets）。
//   4. 以 DATA_SOURCE=sheetsApi 執行 fetch:data。
//
// 注意：此來源以「工作表名稱」讀取（非 gid）。若你的工作表名稱不是「表單回應 1」，
// 以環境變數 SHEET_TAB_NAME 覆寫。
import { JWT } from 'google-auth-library'
import type { SheetInput } from './csvPublic'

export async function fetchSheetsApi(sheet: SheetInput): Promise<string[][]> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('缺少環境變數 GOOGLE_SERVICE_ACCOUNT_JSON（Service Account 金鑰）')
  }
  const creds = JSON.parse(raw) as { client_email: string; private_key: string }
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const tab = process.env.SHEET_TAB_NAME ?? '表單回應 1'
  const range = encodeURIComponent(tab)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`
  const res = await client.request<{ values?: string[][] }>({ url })
  return res.data.values ?? []
}
