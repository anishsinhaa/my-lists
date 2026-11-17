import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../../../api/lists/item.js'
import { resetEnvCache } from '../../config/env.js'
import { signToken } from '../../auth/tokens.js'

const state = vi.hoisted(() => ({ rows: [] as unknown[][] }))

vi.mock('../../sheets/client.js', () => ({
  createSheetsClient: () => ({
    async batchGetValues() {
      return [{ range: "'Movies'!A1:Z3000", values: state.rows.map((row) => [...row]) }]
    },
    async batchUpdateValues(updates: Array<{ range: string; value: string | number }>) {
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null || cell[1] === undefined || cell[2] === undefined) continue
        const column = [...cell[1]].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1
        const row = state.rows[Number(cell[2]) - 1] ?? []
        row[column] = update.value
        state.rows[Number(cell[2]) - 1] = row
      }
    },
  }),
}))

const HASH = '$2b$12$zigsia//994jEQvd8AlEG.HG8HoftXQK5eymy9HuJcIPFnSchQzEG'

function useEnv(): void {
  process.env.AUTH_USERNAME = 'anish'
  process.env.AUTH_PASSWORD_HASH = HASH
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars'
  process.env.JWT_EXPIRES_IN = '30d'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb'
  process.env.RAWG_API_KEY = 'rawg'
  process.env.OPEN_LIBRARY_CONTACT = 'me@example.com'
  resetEnvCache()
}

afterEach(() => {
  resetEnvCache()
})

function capture(): { res: VercelResponse; status: () => number; body: () => unknown } {
  const state = { statusCode: 200, payload: undefined as unknown }
  const res = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(data: unknown) {
      state.payload = data
    },
    setHeader() {
      return this
    },
  }
  return { res: res as unknown as VercelResponse, status: () => state.statusCode, body: () => state.payload }
}

const header = ['Title', 'Year', 'Status', 'My Rating', 'Updated at', 'Notes', 'Date finished']

describe('POST /api/lists/item', () => {
  it('rejects a missing token and writes an authenticated status change', async () => {
    useEnv()
    state.rows = [header, ['Heat', 1995, 'Want to', '', '', '', '']]
    const missing = capture()
    await handler({ method: 'POST', headers: {}, body: {} } as unknown as VercelRequest, missing.res)
    expect(missing.status()).toBe(401)
    const token = await signToken({ id: 'local', username: 'anish' })
    const saved = capture()
    await handler({
      method: 'POST',
      headers: { authorization: `Bearer ${token.token}` },
      body: { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 8 },
    } as unknown as VercelRequest, saved.res)
    expect(saved.status()).toBe(200)
    const payload = saved.body() as { ok: boolean; data: { outcome: string; finishedOn: string } }
    expect(payload.ok).toBe(true)
    expect(payload.data.outcome).toBe('written')
    expect(payload.data.finishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.rows[1]?.[2]).toBe('Watched')
    expect(state.rows[1]?.[3]).toBe(8)
    expect(state.rows[1]?.[4]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(state.rows[1]?.[7]).toBeUndefined()
  })

  it('returns 400 for a body that is not an item update', async () => {
    useEnv()
    const token = await signToken({ id: 'local', username: 'anish' })
    const bad = capture()
    await handler({ method: 'POST', headers: { authorization: `Bearer ${token.token}` }, body: { title: 'Heat' } } as unknown as VercelRequest, bad.res)
    expect(bad.status()).toBe(400)
  })
})
