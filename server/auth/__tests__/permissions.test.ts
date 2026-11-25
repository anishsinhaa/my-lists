import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import item from '../../../api/lists/item.js'
import lists from '../../../api/lists.js'
import picks from '../../../api/picks/status.js'
import fill from '../../../api/posters/fill.js'
import settings from '../../../api/settings.js'
import enrich from '../../../api/settings/enrich.js'
import { canEdit } from '../../../src/types/auth.js'
import { LIST_IDS, PICKS_IDS, type TabId } from '../../../src/types/lists.js'
import type { EnrichField, ListsPayload, PickItem } from '../../../src/types/media.js'
import { resetEnvCache } from '../../config/env.js'
import { signToken } from '../tokens.js'
import { resetListsCache } from '../../sheets/cache.js'

const state = vi.hoisted(() => ({
  rows: [] as unknown[][],
  updates: 0,
  reads: 0,
}))

vi.mock('../../sheets/client.js', () => ({
  createSheetsClient: () => ({
    async batchGetValues() {
      return [{ range: "'Movies'!A1:Z3000", values: state.rows.map((row) => [...row]) }]
    },
    async batchUpdateValues(updates: Array<{ range: string; value: string | number }>) {
      state.updates += 1
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

vi.mock('../../sheets/readAll.js', () => ({
  async readAll(): Promise<ListsPayload> {
    state.reads += 1
    const lists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
    const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
    const cell: Record<EnrichField, boolean> = { poster: false, creator: false, franchise: false, imdbRating: false }
    const tabs = [...LIST_IDS, ...PICKS_IDS] as TabId[]
    const columns = Object.fromEntries(tabs.map((id) => [id, { ...cell }])) as unknown as ListsPayload['columns']
    const heat: PickItem = {
      id: 'movies-picks:heat:1995',
      picksId: 'movies-picks',
      targetList: 'movies',
      title: 'Heat',
      titleKey: 'heat',
      becauseYouLiked: '',
      becauseKey: '',
      year: 1995,
      genres: [],
      status: '',
      why: '',
      poster: null,
    }
    picks['movies-picks'] = [heat]
    return {
      fetchedAt: '2020-01-01T00:00:00.000Z',
      dataHash: 'hash',
      lists,
      picks,
      warnings: [{ tab: 'movies-picks', code: 'missing_header', message: 'picks' }],
      columns,
    }
  },
}))

function useEnv(): void {
  process.env.AUTH_USERNAME = 'anish'
  process.env.AUTH_PASSWORD_HASH = '$2b$12$zigsia//994jEQvd8AlEG.HG8HoftXQK5eymy9HuJcIPFnSchQzEG'
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars'
  process.env.JWT_EXPIRES_IN = '30d'
  process.env.GUEST_MODE = 'true'
  process.env.GUEST_EXPIRES_IN = '7d'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb'
  process.env.RAWG_API_KEY = 'rawg'
  process.env.OPEN_LIBRARY_CONTACT = 'me@example.com'
  process.env.FEATURE_PICKS = 'true'
  resetEnvCache()
}

function capture(): { res: VercelResponse; status: () => number; body: () => unknown } {
  const sent = { statusCode: 200, payload: undefined as unknown }
  const res = {
    status(code: number) {
      sent.statusCode = code
      return this
    },
    json(data: unknown) {
      sent.payload = data
    },
    setHeader() {
      return this
    },
  }
  return { res: res as unknown as VercelResponse, status: () => sent.statusCode, body: () => sent.payload }
}

const owner = { id: 'local', username: 'anish', role: 'owner' as const, accountId: 'main' }
const guestUser = { id: 'guest', username: 'Guest', role: 'guest' as const, accountId: 'main' }

async function bearer(user: typeof owner | typeof guestUser): Promise<string> {
  const session = await signToken(user)
  return `Bearer ${session.token}`
}

beforeEach(() => {
  useEnv()
  state.rows = [['Title', 'Year', 'Status', 'My Rating', 'Updated at', 'Notes', 'Date finished'], ['Heat', 1995, 'Want to', '', '', '', '']]
  state.updates = 0
  state.reads = 0
  resetListsCache()
})

describe('canEdit', () => {
  it('allows only the owner of the same account', () => {
    expect(canEdit(owner, 'main')).toBe(true)
    expect(canEdit({ ...owner, accountId: 'other' }, 'main')).toBe(false)
    expect(canEdit(guestUser, 'main')).toBe(false)
    expect(canEdit(null, 'main')).toBe(false)
  })
})

describe('owner-only writes', () => {
  it('lets the owner update an item and blocks a guest before any sheet write', async () => {
    const allowed = capture()
    await item({
      method: 'POST',
      headers: { authorization: await bearer(owner) },
      body: { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 8 },
    } as unknown as VercelRequest, allowed.res)
    expect(allowed.status()).toBe(200)
    expect((allowed.body() as { data: { outcome: string } }).data.outcome).toBe('written')
    expect(state.updates).toBeGreaterThan(0)

    state.updates = 0
    const blocked = capture()
    await item({
      method: 'POST',
      headers: { authorization: await bearer(guestUser) },
      body: { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 8 },
    } as unknown as VercelRequest, blocked.res)
    expect(blocked.status()).toBe(403)
    expect(blocked.body()).toMatchObject({ ok: false, error: { code: 'forbidden' } })
    expect(state.updates).toBe(0)
  })

  it('blocks guest writes on picks, posters, settings, and enrich', async () => {
    const authorization = await bearer(guestUser)
    const calls = [
      (res: VercelResponse) => picks({ method: 'POST', headers: { authorization }, body: { picksId: 'movies-picks', title: 'Heat', year: 1995, because: 'Because', status: 'Watched', expectedCurrent: '' } } as unknown as VercelRequest, res),
      (res: VercelResponse) => fill({ method: 'POST', headers: { authorization }, body: { items: [] } } as unknown as VercelRequest, res),
      (res: VercelResponse) => settings({ method: 'PUT', headers: { authorization }, body: { picks: { enabled: true, movies: true, series: true, games: true } } } as unknown as VercelRequest, res),
      (res: VercelResponse) => enrich({ method: 'POST', headers: { authorization }, body: { tab: 'movies', force: false } } as unknown as VercelRequest, res),
    ]
    for (const call of calls) {
      const blocked = capture()
      await call(blocked.res)
      expect(blocked.status()).toBe(403)
      expect(blocked.body()).toMatchObject({ ok: false, error: { code: 'forbidden' } })
    }
    expect(state.updates).toBe(0)
  })

  it('serves a guest the cached lists and ignores refresh=1', async () => {
    const authorization = await bearer(guestUser)
    const first = capture()
    await lists({ method: 'GET', headers: { authorization }, query: { refresh: '1' } } as unknown as VercelRequest, first.res)
    const second = capture()
    await lists({ method: 'GET', headers: { authorization }, query: { refresh: '1' } } as unknown as VercelRequest, second.res)
    expect(first.status()).toBe(200)
    const guestBody = first.body() as { ok: boolean; data: { picks: Record<string, unknown[]>; columns: Record<string, unknown>; warnings: unknown[] } }
    expect(guestBody.ok).toBe(true)
    expect(guestBody.data.picks['movies-picks']).toEqual([])
    expect(guestBody.data.picks['series-picks']).toEqual([])
    expect(guestBody.data.picks['games-picks']).toEqual([])
    expect(guestBody.data.columns['movies-picks']).toBeUndefined()
    expect(guestBody.data.warnings).toEqual([])
    expect(second.status()).toBe(200)
    expect(state.reads).toBe(1)
    expect(state.updates).toBe(0)
  })

  it('keeps picks on an owner lists response', async () => {
    const seen = capture()
    await lists({ method: 'GET', headers: { authorization: await bearer(owner) }, query: {} } as unknown as VercelRequest, seen.res)
    expect(seen.status()).toBe(200)
    const body = seen.body() as { ok: boolean; data: { picks: Record<string, Array<{ title: string }>> } }
    expect(body.ok).toBe(true)
    expect(body.data.picks['movies-picks']?.[0]?.title).toBe('Heat')
  })
})
