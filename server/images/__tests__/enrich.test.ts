import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '../../config/env.js'
import type { PosterFillItem } from '../../../src/types/api.js'
import type { SheetsClient } from '../../sheets/client.js'
import { enrichItems, parseFillItems } from '../enrich.js'

const calls = vi.hoisted(() => ({ count: 0 }))

vi.mock('../resolve.js', () => ({
  providerFor: () => ({
    id: 'tmdb',
    lookup: async (query: { need: string[] }) => {
      calls.count += 1
      return {
        poster: query.need.includes('poster') ? 'https://img.example/new.jpg' : undefined,
        imdbRating: query.need.includes('imdbRating') ? 8.1 : undefined,
        sourceId: '1',
        confidence: 1,
      }
    },
  }),
}))

function client(rows: unknown[][]): SheetsClient & { rows: unknown[][] } {
  return {
    rows,
    async batchGetValues() {
      return [{ range: "'Movies'!A1:Z3000", values: rows }]
    },
    async batchUpdateValues(updates) {
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null) continue
        const column = cell[1] === 'C' ? 2 : 6
        rows[Number(cell[2]) - 1]![column] = update.value
      }
    },
  }
}

const header = ['Title', 'Year', 'Poster', 'Director/Creator', 'Franchise', 'My Rating', 'IMDb Rating']

beforeEach(() => {
  calls.count = 0
  process.env.AUTH_USERNAME = 'zeus'
  process.env.AUTH_PASSWORD_HASH = 'hash'
  process.env.JWT_SECRET = 'local-dev-secret-that-is-at-least-32-characters'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb-token'
  process.env.RAWG_API_KEY = 'rawg-token'
  process.env.OPEN_LIBRARY_CONTACT = 'you@example.com'
  process.env.OMDB_API_KEY = 'omdb-token'
  resetEnvCache()
})

describe('enrichItems', () => {
  it('skips a full row and writes a numeric rating into an empty cell', async () => {
    const full = client([header, ['Inception', 2010, 'https://img.example/p.jpg', 'Christopher Nolan', 'Nolan', 9, 8.8]])
    const filled = await enrichItems(full, [{ tab: 'movies', title: 'Inception', year: 2010, needs: ['poster', 'imdbRating'] }])
    expect(filled[0]?.outcome).toBe('already_filled')
    expect(calls.count).toBe(0)
    const empty = client([header, ['Heat', 1995, 'https://img.example/old.jpg', 'Michael Mann', '', 9, '']])
    const result = await enrichItems(empty, [{ tab: 'movies', title: 'Heat', year: 1995, needs: ['imdbRating'] }])
    expect(result[0]?.written.imdbRating).toBe(true)
    expect(empty.rows[1]?.[6]).toBe(8.1)
    expect(empty.rows[1]?.[5]).toBe(9)
  })

  it('rejects myRating and other tabs', () => {
    expect(() => parseFillItems({ items: [{ tab: 'movies', title: 'Heat', year: 1995, needs: ['myRating'] }] })).toThrow()
    const other: PosterFillItem = { tab: 'other', title: 'Note', year: null, needs: ['poster'] }
    return expect(enrichItems(client([header]), [other])).resolves.toMatchObject([{ outcome: 'write_skipped', detail: 'skipped_policy' }])
  })
})
