import { auth, sheets } from '@googleapis/sheets'
import type { Env } from '../config/env.js'

export interface SheetsClient {
  batchGetValues(ranges: string[]): Promise<Array<{ range: string; values: unknown[][] }>>
  batchUpdateValues(updates: Array<{ range: string; value: string | number }>): Promise<void>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function statusOf(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0
  const code = 'code' in error ? Number(error.code) : 0
  if (code === 429 || code >= 500) return code
  const status = 'status' in error ? Number(error.status) : 0
  return Number.isFinite(status) ? status : 0
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  const waits = [5000, 20000, 65000]
  let last: unknown
  for (let attempt = 0; attempt <= waits.length; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      last = error
      const status = statusOf(error)
      const wait = status === 429 ? 65000 : waits[attempt]
      if (attempt === waits.length || (status !== 429 && status < 500) || wait === undefined) break
      await sleep(wait)
    }
  }
  throw last instanceof Error ? last : new Error('Sheets request failed')
}

export function createSheetsClient(env: Env): SheetsClient {
  const jwt = new auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const api = sheets({ version: 'v4', auth: jwt })
  return {
    async batchGetValues(ranges) {
      const response = await withRetry(() => api.spreadsheets.values.batchGet({ spreadsheetId: env.GOOGLE_SHEET_ID, ranges, valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' }))
      return (response.data.valueRanges ?? []).map((range) => ({ range: range.range ?? '', values: (range.values ?? []) as unknown[][] }))
    },
    async batchUpdateValues(updates) {
      const size = 80
      for (let index = 0; index < updates.length; index += size) {
        const slice = updates.slice(index, index + size)
        await withRetry(() => api.spreadsheets.values.batchUpdate({
          spreadsheetId: env.GOOGLE_SHEET_ID,
          requestBody: {
            valueInputOption: 'RAW',
            data: slice.map((update) => ({ range: update.range, values: [[update.value]] })),
          },
        }))
        if (index + size < updates.length) await sleep(400)
      }
    },
  }
}
