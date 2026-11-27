import { describe, expect, it } from 'vitest'
import { shelfGroups } from '@/design/archive'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { DEFAULT_QUERY, type ListQuery } from '../listQuery'
import { selectItems } from '../selectItems'

const NOW = new Date('2026-01-01T00:00:00.000Z')
const VIEWS = ['shelves', 'grid', 'table'] as const

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'title'>): MediaItem {
  return {
    id: partial.title,
    listId: partial.listId ?? 'movies',
    titleKey: partial.title.toLowerCase(),
    status: '',
    statusGroup: 'unknown',
    year: null,
    genres: [],
    why: '',
    updatedAt: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    extra: {},
    ...partial,
    notes: partial.notes ?? '',
    dateAdded: partial.dateAdded ?? null,
    favourite: partial.favourite ?? false,
  }
}

function shown(listId: ListId, items: MediaItem[], query: Partial<ListQuery>) {
  return selectItems(listId, items, { ...DEFAULT_QUERY, ...query }, NOW)
}

function titles(listId: ListId, items: MediaItem[], query: Partial<ListQuery>) {
  return shown(listId, items, query).map((entry) => entry.title)
}

function shelves(listId: ListId, items: MediaItem[], query: Partial<ListQuery>) {
  return shelfGroups(listId, shown(listId, items, query), 'given').map((group) => group.status)
}

const movies = [
  item({ title: 'Inception', creator: 'Christopher Nolan', status: 'Watched', year: 2010, genres: ['Sci-Fi'], myRating: 9, imdbRating: 8.8, updatedAt: '2020-01-01T00:00:00.000Z' }),
  item({ title: 'Tenet', creator: 'Christopher Nolan', status: 'Want to', year: 2020, genres: ['Sci-Fi'], myRating: 7, imdbRating: 7.3, updatedAt: '2023-01-01T00:00:00.000Z' }),
  item({ title: 'Iron Man', creator: 'Jon Favreau', franchise: 'Marvel', status: 'Watched', year: 2008, genres: ['Action'], myRating: 8, imdbRating: 7.9, updatedAt: '2025-01-01T00:00:00.000Z' }),
  item({ title: 'Maybe One', status: ' Maybe ', year: 2012, genres: ['Drama'], myRating: 6, imdbRating: 6, updatedAt: '2021-01-01T00:00:00.000Z' }),
  item({ title: 'Crowd', status: 'Want to', year: 2022, genres: ['Drama'], myRating: 6, imdbRating: 9.2, updatedAt: '2024-06-01T00:00:00.000Z' }),
  item({ title: 'Want One', status: 'Want to', year: 1999, genres: ['Comedy'], myRating: null, imdbRating: 5, updatedAt: '2019-01-01T00:00:00.000Z' }),
]

const movieCases: { name: string; query: Partial<ListQuery>; titles: string[]; shelves: string[] }[] = [
  { name: 'status', query: { statuses: ['Maybe'] }, titles: ['Maybe One'], shelves: ['Maybe'] },
  { name: 'genre', query: { genres: ['Sci-Fi'] }, titles: ['Inception', 'Tenet'], shelves: ['Want to', 'Watched'] },
  { name: 'year', query: { yearMin: 2010, yearMax: 2020 }, titles: ['Inception', 'Maybe One', 'Tenet'], shelves: ['Want to', 'Maybe', 'Watched'] },
  { name: 'creator', query: { creator: 'Christopher Nolan' }, titles: ['Inception', 'Tenet'], shelves: ['Want to', 'Watched'] },
  { name: 'franchise', query: { franchise: 'Marvel' }, titles: ['Iron Man'], shelves: ['Watched'] },
  { name: 'rating', query: { ratingMin: 8 }, titles: ['Inception', 'Iron Man'], shelves: ['Watched'] },
  { name: 'search', query: { q: 'tenet' }, titles: ['Tenet'], shelves: ['Want to'] },
  { name: 'nolan', query: { smart: 'nolan' }, titles: ['Inception', 'Tenet'], shelves: ['Want to', 'Watched'] },
  { name: 'marvel', query: { smart: 'marvel' }, titles: ['Iron Man'], shelves: ['Watched'] },
  { name: 'top rated', query: { smart: 'top-rated' }, titles: ['Crowd', 'Inception', 'Iron Man'], shelves: ['Want to', 'Watched'] },
]

describe.each(VIEWS)('%s view', (view) => {
  for (const spec of movieCases) {
    it(`filters movies by ${spec.name}`, () => {
      expect(titles('movies', movies, { view, ...spec.query })).toEqual(spec.titles)
      if (view === 'shelves') expect(shelves('movies', movies, spec.query)).toEqual(spec.shelves)
    })
  }
})

describe('status shelves', () => {
  it('hides the Want to shelf when Maybe is selected', () => {
    for (const view of VIEWS) {
      const rows = shown('movies', movies, { view, statuses: ['Maybe'] })
      expect(rows.map((row) => row.title)).toEqual(['Maybe One'])
      expect(rows.some((row) => row.status.trim().toLowerCase() === 'want to')).toBe(false)
    }
    expect(shelves('movies', movies, { statuses: ['Maybe'] })).not.toContain('Want to')
  })

  it('keeps top rated order inside a watched shelf', () => {
    const groups = shelfGroups('movies', shown('movies', movies, { smart: 'top-rated' }), 'given')
    expect(groups.find((group) => group.status === 'Watched')?.items.map((row) => row.title)).toEqual(['Inception', 'Iron Man'])
  })
})

const categoryCases: { listId: ListId; status: string; keep: string; drop: string }[] = [
  { listId: 'series', status: 'Maybe later', keep: 'Later', drop: 'Queued' },
  { listId: 'anime', status: 'Maybe later', keep: 'Later', drop: 'Queued' },
  { listId: 'games', status: 'Playing', keep: 'Hades', drop: 'Shelf' },
  { listId: 'books', status: 'Reading', keep: 'Dune', drop: 'Closed' },
]

describe.each(VIEWS)('%s category status', (view) => {
  for (const spec of categoryCases) {
    it(`filters ${spec.listId} by ${spec.status}`, () => {
      const rows = [
        item({ title: spec.keep, status: spec.status, listId: spec.listId }),
        item({ title: spec.drop, status: spec.listId === 'books' ? 'Bought' : spec.listId === 'games' ? 'Want to' : 'Want to', listId: spec.listId }),
      ]
      expect(titles(spec.listId, rows, { view, statuses: [spec.status] })).toEqual([spec.keep])
      if (view === 'shelves') expect(shelves(spec.listId, rows, { statuses: [spec.status] })).toEqual([spec.status])
    })
  }
})
