import { describe, expect, it } from 'vitest'
import { applyListQuery } from '@/features/lists/filters/applyListQuery'
import { parseListQuery } from '@/features/lists/filters/listQuery'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { posterHref, wallTiles } from '../wall'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'listId' | 'title' | 'status'>): MediaItem {
  return {
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'unknown',
    year: 2012,
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
    favourite: partial.favourite ?? false,
  }
}

function payload(rows: MediaItem[]): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, [] as MediaItem[]])) as Record<ListId, MediaItem[]>
  for (const row of rows) lists[row.listId] = [...lists[row.listId], row]
  return { fetchedAt: '', dataHash: '', lists, picks: { 'movies-picks': [], 'series-picks': [], 'games-picks': [] }, warnings: [], columns: {} as ListsPayload['columns'] }
}

function tile(rows: MediaItem[], id: string) {
  return wallTiles(payload(rows)).find((entry) => entry.id === id)
}

function destinationCount(href: string, rows: MediaItem[]): number {
  const url = new URL(href, 'http://local')
  const listId = url.pathname.replace('/lists/', '') as ListId
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, [] as MediaItem[]])) as Record<ListId, MediaItem[]>
  for (const row of rows) lists[row.listId] = [...lists[row.listId], row]
  return applyListQuery(lists[listId], parseListQuery(url.searchParams), { now: new Date('2026-01-01T00:00:00.000Z'), listId }).length
}

describe('home wall links', () => {
  const mixed = [
    item({ id: 'movies:live', listId: 'movies', title: 'Live film', status: 'In progress' }),
    item({ id: 'series:live', listId: 'series', title: 'Live show', status: 'In progress' }),
    item({ id: 'anime:live', listId: 'anime', title: 'Live anime', status: 'In progress' }),
    item({ id: 'games:play', listId: 'games', title: 'Hades', status: 'Playing' }),
    item({ id: 'games:odd', listId: 'games', title: 'Odd game', status: 'In progress' }),
    item({ id: 'books:read', listId: 'books', title: 'Dune', status: 'Reading' }),
    item({ id: 'books:odd', listId: 'books', title: 'Odd book', status: 'In progress' }),
    item({ id: 'series:next', listId: 'series', title: 'Severance', status: 'Next season out' }),
    item({ id: 'anime:next', listId: 'anime', title: 'Frieren', status: 'Next season out' }),
    item({ id: 'series:pause', listId: 'series', title: 'Paused show', status: 'Paused' }),
    item({ id: 'movies:hold', listId: 'movies', title: 'Held film', status: 'On hold' }),
    item({ id: 'movies:new', listId: 'movies', title: 'New', status: 'Watched', extra: { 'date finished': '2024-02-01' } }),
    item({ id: 'movies:old', listId: 'movies', title: 'Old', status: 'Watched', extra: { 'date finished': '2020-01-01' } }),
    item({ id: 'books:done', listId: 'books', title: 'Finished book', status: 'Read', extra: { 'date finished': '2024-06-01' } }),
    item({ id: 'movies:skip', listId: 'movies', title: 'Queued', status: 'Want to', extra: { 'date finished': '2024-08-01' } }),
    item({ id: 'movies:best', listId: 'movies', title: 'Best', status: 'Watched', myRating: 9 }),
    item({ id: 'series:high', listId: 'series', title: 'High', status: 'Watched', myRating: 8 }),
    item({ id: 'movies:zero', listId: 'movies', title: 'Zero', status: 'Watched', myRating: 0 }),
  ]

  it('points every card at a destination with the same count', () => {
    const tiles = wallTiles(payload(mixed))
    expect(tiles.map((entry) => entry.id)).toEqual(['watching', 'playing', 'reading', 'next', 'paused', 'finished', 'rated'])
    for (const entry of tiles) {
      const count = entry.href.startsWith('/shelf/') ? entry.items.length : destinationCount(entry.href, mixed)
      expect(count, entry.id).toBe(entry.items.length)
    }
  })

  it('keeps Now watching on each title’s own list when the card is mixed', () => {
    const watching = tile(mixed, 'watching')
    expect(watching?.href).toBe('/shelf/watching')
    expect(watching?.items.map((entry) => entry.id)).toEqual(['movies:live', 'series:live', 'anime:live'])
    const anime = watching?.items.find((entry) => entry.listId === 'anime')
    expect(anime === undefined ? '' : posterHref(anime, watching!.filter)).toBe('/lists/anime?status=In+progress&item=anime%3Alive')
  })

  it('opens a single-category Now watching list on that category', () => {
    const watching = tile([item({ id: 'anime:live', listId: 'anime', title: 'Live anime', status: 'In progress' })], 'watching')
    expect(watching?.href).toBe('/lists/anime?status=In+progress')
    expect(watching?.items).toHaveLength(1)
    expect(destinationCount(watching!.href, watching!.items)).toBe(1)
  })

  it('opens Now playing on games, including an In progress row', () => {
    const playing = tile(mixed, 'playing')
    expect(playing?.href).toBe('/lists/games?status=Playing%2CIn+progress')
    expect(playing?.items.map((entry) => entry.title)).toEqual(['Hades', 'Odd game'])
  })

  it('opens Now reading on books, including an In progress row', () => {
    const reading = tile(mixed, 'reading')
    expect(reading?.href).toBe('/lists/books?status=Reading%2CIn+progress')
    expect(reading?.items.map((entry) => entry.title)).toEqual(['Dune', 'Odd book'])
  })

  it('keeps Next season out across series and anime', () => {
    const next = tile(mixed, 'next')
    expect(next?.href).toBe('/shelf/next')
    expect(next?.items.map((entry) => entry.id)).toEqual(['series:next', 'anime:next'])
  })

  it('opens Paused and On hold together, and uses a shelf when the categories differ', () => {
    const paused = tile(mixed, 'paused')
    expect(paused?.href).toBe('/shelf/paused')
    expect(paused?.items.map((entry) => entry.status)).toEqual(['On hold', 'Paused'])
    const seriesOnly = tile([
      item({ id: 'series:pause', listId: 'series', title: 'Paused show', status: 'Paused' }),
      item({ id: 'series:hold', listId: 'series', title: 'Held show', status: 'On hold' }),
    ], 'paused')
    expect(seriesOnly?.href).toBe('/lists/series?status=Paused%2COn+hold')
    expect(destinationCount(seriesOnly!.href, seriesOnly!.items)).toBe(2)
  })

  it('sorts Recently finished by Date finished and leaves unfinished titles out', () => {
    const finished = tile(mixed, 'finished')
    expect(finished?.href).toBe('/shelf/finished')
    expect(finished?.items.map((entry) => entry.title)).toEqual(['Finished book', 'New', 'Old', 'Best', 'High', 'Zero'])
    const movies = [
      item({ id: 'movies:new', listId: 'movies', title: 'New', status: 'Watched', extra: { 'date finished': '2024-02-01' } }),
      item({ id: 'movies:old', listId: 'movies', title: 'Old', status: 'Watched', extra: { 'date finished': '2020-01-01' } }),
      item({ id: 'movies:plain', listId: 'movies', title: 'Plain', status: 'Watched' }),
      item({ id: 'movies:skip', listId: 'movies', title: 'Queued', status: 'Want to', extra: { 'date finished': '2024-08-01' } }),
    ]
    const only = tile(movies, 'finished')
    expect(only?.href).toBe('/lists/movies?status=Watched%2CPlayed%2CCompleted%2CRead&sort=finished&dir=desc')
    expect(only?.items.map((entry) => entry.title)).toEqual(['New', 'Old', 'Plain'])
    expect(destinationCount(only!.href, movies)).toBe(3)
  })

  it('sorts Top rated by My rating and drops a zero', () => {
    const rated = tile(mixed, 'rated')
    expect(rated?.href).toBe('/shelf/rated')
    expect(rated?.items.map((entry) => entry.title)).toEqual(['Best', 'High'])
    const movies = [
      item({ id: 'movies:best', listId: 'movies', title: 'Best', status: 'Watched', myRating: 9 }),
      item({ id: 'movies:good', listId: 'movies', title: 'Good', status: 'Watched', myRating: 7 }),
      item({ id: 'movies:zero', listId: 'movies', title: 'Zero', status: 'Watched', myRating: 0 }),
    ]
    const only = tile(movies, 'rated')
    expect(only?.href).toBe('/lists/movies?sort=myRating&dir=desc&rmin=0.1&rby=my')
    expect(only?.items.map((entry) => entry.title)).toEqual(['Best', 'Good'])
    expect(destinationCount(only!.href, movies)).toBe(2)
  })

  it('hides a card that has no titles', () => {
    expect(tile([], 'playing')).toBeUndefined()
  })
})
