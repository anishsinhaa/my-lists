import { auth, sheets } from '@googleapis/sheets'
import type { Env } from '../config/env.js'

export interface SheetsClient {
  batchGetValues(ranges: string[]): Promise<Array<{ range: string; values: unknown[][] }>>
  batchUpdateValues(updates: Array<{ range: string; value: string | number }>): Promise<void>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  const waits = [500, 1000, 2000]
  let last: unknown
  for (let attempt = 0; attempt <= waits.length; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      last = error
      const status = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : 0
      const retry = status === 429 || status >= 500
      const wait = waits[attempt]
      if (!retry || wait === undefined) break
      await sleep(wait + Math.floor(Math.random() * 100))
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
      if (updates.length === 0) return
      await withRetry(() => api.spreadsheets.values.batchUpdate({
        spreadsheetId: env.GOOGLE_SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates.map((update) => ({ range: update.range, values: [[update.value]] })),
        },
      }))
    },
  }
}
