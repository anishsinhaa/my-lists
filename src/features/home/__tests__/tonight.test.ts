import { beforeEach, describe, expect, it } from 'vitest'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { choosePick, defaultStatuses, itemHref, readTonight, runtimeMinutes, spinFrames, TONIGHT_KEY, tonightMatches, type TonightChoice } from '../tonight'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'listId' | 'title' | 'status'>): MediaItem {
  return {
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'planned',
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
    dateAdded: partial.dateAdded ?? null,
    favourite: partial.favourite ?? false,
  }
}

function lists(rows: MediaItem[]): Record<ListId, MediaItem[]> {
  const blank = Object.fromEntries(LIST_IDS.map((id) => [id, [] as MediaItem[]])) as Record<ListId, MediaItem[]>
  for (const row of rows) blank[row.listId] = [...blank[row.listId], row]
  return blank
}

const base: TonightChoice = { category: 'movies', statuses: ['Want to'], genres: [], short: false }

describe('tonight picks', () => {
  beforeEach(() => localStorage.clear())

  it('uses the queue defaults for each category', () => {
    expect(defaultStatuses('movies')).toEqual(['Must watch', 'Want to'])
    expect(defaultStatuses('series')).toEqual(['Want to'])
    expect(defaultStatuses('books')).toEqual(['Want to buy', 'Bought'])
    expect(defaultStatuses('any')).toEqual(['Must watch', 'Want to', 'Want to buy', 'Bought'])
  })

  it('matches status, genre, and a short runtime only when that data exists', () => {
    const rows = lists([
      item({ id: 'movies:short:2010', listId: 'movies', title: 'Short', status: 'Want to', genres: ['Drama'], extra: { runtime: '90 min' } }),
      item({ id: 'movies:long:2011', listId: 'movies', title: 'Long', status: 'Want to', genres: ['Drama'], extra: { runtime: '2h 10m' } }),
      item({ id: 'movies:watched:2012', listId: 'movies', title: 'Seen', status: 'Watched', genres: ['Comedy'], extra: { runtime: '80' } }),
      item({ id: 'books:dune:1965', listId: 'books', title: 'Dune', status: 'Want to buy' }),
    ])
    expect(tonightMatches(rows, base).map((row) => row.title)).toEqual(['Short', 'Long'])
    expect(tonightMatches(rows, { ...base, genres: ['Comedy'] }).map((row) => row.title)).toEqual([])
    expect(tonightMatches(rows, { ...base, short: true }).map((row) => row.title)).toEqual(['Short'])
    expect(tonightMatches(rows, { ...base, statuses: [] }).map((row) => row.title)).toEqual(['Short', 'Long', 'Seen'])
    expect(runtimeMinutes(item({ id: 'x', listId: 'movies', title: 'X', status: 'Want to', extra: { length: '2h' } }))).toBe(120)
    expect(tonightMatches(rows, { category: 'any', statuses: ['Want to', 'Want to buy'], genres: [], short: false }).map((row) => row.title)).toEqual(['Short', 'Long', 'Dune'])
  })

  it('does not repeat the previous pick when another title matches', () => {
    const rows = [
      item({ id: 'a', listId: 'movies', title: 'A', status: 'Want to' }),
      item({ id: 'b', listId: 'movies', title: 'B', status: 'Want to' }),
    ]
    expect(choosePick(rows, null, () => 0)?.id).toBe('a')
    expect(choosePick(rows, 'a', () => 0)?.id).toBe('b')
    expect(choosePick([rows[0]!], 'a', () => 0)?.id).toBe('a')
    expect(spinFrames(rows, rows[1]!, 4, () => 0).at(-1)?.id).toBe('b')
    expect(itemHref(rows[0]!)).toBe('/lists/movies?item=a')
  })

  it('remembers the last category and statuses, and falls back when they do not fit', () => {
    const rows = lists([])
    localStorage.setItem(TONIGHT_KEY, JSON.stringify({ category: 'series', statuses: ['Want to', 'Paused'] }))
    expect(readTonight(rows)).toEqual({ category: 'series', statuses: ['Want to', 'Paused'], genres: [], short: false })
    expect(readTonight(rows, 'books').statuses).toEqual(['Want to buy', 'Bought'])
    localStorage.setItem(TONIGHT_KEY, JSON.stringify({ category: 'movies', statuses: [] }))
    expect(readTonight(rows).statuses).toEqual([])
    localStorage.setItem(TONIGHT_KEY, JSON.stringify({ category: 'movies', statuses: ['Not a status'] }))
    expect(readTonight(rows).statuses).toEqual(['Must watch', 'Want to'])
    localStorage.setItem(TONIGHT_KEY, JSON.stringify({ category: 'curious', statuses: ['Want to'] }))
    expect(readTonight(rows).category).toBe('any')
    localStorage.setItem(TONIGHT_KEY, JSON.stringify({ category: 'nope', statuses: [] }))
    expect(readTonight(rows).category).toBe('movies')
  })
})
