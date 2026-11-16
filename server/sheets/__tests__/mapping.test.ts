import { describe, expect, it } from 'vitest'
import { createSheetsClient } from '../client.js'
import { mapMainTab, mapPicksTab } from '../mapping.js'
import type { Env } from '../../config/env.js'

describe('mapMainTab', () => {
  const header = ['Genre', 'Title', 'Year', 'Status', 'Updated at', 'Director', 'My Rating', 'IMDb Rating', 'Notes', 'Franchise', 'Box office']

  it('parses rows, skips blanks, and suffixes duplicate titles', () => {
    const result = mapMainTab('movies', [
      header,
      ['Drama', 'Inception', 2010, 'Watched', 45000, 'Christopher Nolan', 9, 8.1, 'dreams', 'Nolan', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['Sci-fi', 'Inception', 2010, 'Want to', '15/03/2023', 'Someone', 'N/A', '', '', '', ''],
    ])
    expect(result.items).toHaveLength(2)
    expect(result.items[0]?.id).toBe('movies:inception:2010')
    expect(result.items[1]?.id).toBe('movies:inception:2010~2')
    expect(result.items[0]?.updatedAt).toBe('2023-03-15T00:00:00.000Z')
    expect(result.items[1]?.updatedAt).toBe('2023-03-15T00:00:00.000Z')
    expect(result.items[0]?.myRating).toBe(9)
    expect(result.items[0]?.imdbRating).toBe(8.1)
    expect(result.items[1]?.myRating).toBeNull()
    expect(result.items[0]?.creator).toBe('Christopher Nolan')
    expect(result.items[0]?.extra['box office']).toBe('')
    expect(result.warnings.some((warning) => warning.code === 'duplicate_title')).toBe(true)
  })

  it('returns null ratings and no crash when rating columns are absent', () => {
    const result = mapMainTab('movies', [
      ['Title', 'Status'],
      ['Heat', 'Watched'],
    ])
    expect(result.columns.imdbRating).toBe(false)
    expect(result.items[0]?.myRating).toBeNull()
    expect(result.items[0]?.imdbRating).toBeNull()
  })

  it('warns and returns nothing when Title is missing', () => {
    const result = mapMainTab('movies', [['Status'], ['Watched']])
    expect(result.items).toEqual([])
    expect(result.warnings[0]?.code).toBe('missing_title_column')
  })

  it('keeps picks poster-only columns', () => {
    const result = mapPicksTab('movies-picks', [
      ['Title', 'Because you liked', 'Status'],
      ['Dune', 'Arrival', ''],
    ])
    expect(result.columns).toEqual({ poster: false, creator: false, franchise: false, imdbRating: false })
    expect(result.items[0]?.becauseYouLiked).toBe('Arrival')
    expect(result.items[0]?.targetList).toBe('movies')
  })
})

describe('SheetsClient surface', () => {
  it('exposes only the two value methods', () => {
    const client = createSheetsClient({ GOOGLE_SERVICE_ACCOUNT_EMAIL: 'bot@example.com', GOOGLE_PRIVATE_KEY: 'key', GOOGLE_SHEET_ID: 'sheet' } as Env)
    expect(Object.keys(client).sort()).toEqual(['batchGetValues', 'batchUpdateValues'])
  })
})
