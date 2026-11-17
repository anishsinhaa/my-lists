import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '../../config/env.js'
import type { SheetsClient } from '../../sheets/client.js'
import { backfillAll } from '../backfill.js'

vi.mock('../resolve.js', () => ({
  providerFor: () => ({
    id: 'tmdb',
    lookup: async (query: { title: string; need: string[] }) => {
      if (query.title === 'Nowhere') return null
      return {
        poster: query.need.includes('poster') ? 'https://img.example/new.jpg' : undefined,
        imdbRating: query.need.includes('imdbRating') ? 7.5 : undefined,
        sourceId: '1',
        confidence: 1,
      }
    },
  }),
}))

function columnIndex(letters: string): number {
  let value = 0
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64
  return value - 1
}

function memory(rows: unknown[][]): SheetsClient & { rows: unknown[][] } {
  return {
    rows,
    async batchGetValues(ranges) {
      const range = ranges[0] ?? ''
      return [{ range, values: range.includes("'Movies'") ? rows : [['Title', 'Year', 'Poster', 'IMDb Rating']] }]
    },
    async batchUpdateValues(updates) {
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null) continue
        const line = rows[Number(cell[2]) - 1] ?? []
        line[columnIndex(cell[1] ?? 'A')] = update.value
        rows[Number(cell[2]) - 1] = line
      }
    },
  }
}

beforeEach(() => {
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

describe('backfillAll', () => {
  it('writes only blank poster and rating cells', async () => {
    const header = ['Title', 'Year', 'Poster', 'Director/Creator', 'Franchise', 'My Rating', 'IMDb Rating']
    const client = memory([
      header,
      ['Heat', 1995, 'https://img.example/old.jpg', 'Michael Mann', '', 9, 8.8],
      ['Triangle of Sadness (2022)', 2022, '', '', '', 7, ''],
      ['Nowhere', 2001, '', '', '', '', ''],
    ])
    const [movies] = await backfillAll(client, () => undefined)
    expect(client.rows[1]?.[2]).toBe('https://img.example/old.jpg')
    expect(client.rows[1]?.[5]).toBe(9)
    expect(client.rows[1]?.[6]).toBe(8.8)
    expect(client.rows[2]?.[2]).toBe('https://img.example/new.jpg')
    expect(client.rows[2]?.[6]).toBe(7.5)
    expect(client.rows[2]?.[5]).toBe(7)
    expect(client.rows[3]?.[2]).toBe('')
    expect(movies?.posterFilled).toBe(1)
    expect(movies?.posterMissing).toBe(1)
    expect(movies?.imdbFilled).toBe(1)
    expect(movies?.failures).toEqual([{ title: 'Nowhere', reason: 'no match' }])
  })

  it('overwrites an existing poster and rating when force is on for one tab', async () => {
    const header = ['Title', 'Year', 'Poster', 'Director/Creator', 'Franchise', 'My Rating', 'IMDb Rating']
    const client = memory([
      header,
      ['Heat', 1995, 'https://img.example/old.jpg', 'Michael Mann', '', 9, 8.8],
      ['Triangle of Sadness (2022)', 2022, '', '', '', 7, ''],
    ])
    const [movies] = await backfillAll(client, () => undefined, { tabs: ['movies'], force: true })
    expect(client.rows[1]?.[2]).toBe('https://img.example/new.jpg')
    expect(client.rows[1]?.[6]).toBe(7.5)
    expect(client.rows[1]?.[5]).toBe(9)
    expect(client.rows[2]?.[2]).toBe('https://img.example/new.jpg')
    expect(movies?.posterFilled).toBe(2)
  })
})
