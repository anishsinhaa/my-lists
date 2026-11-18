import { describe, expect, it } from 'vitest'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { applyListQuery } from '../applyListQuery'
import { DEFAULT_QUERY } from '../listQuery'
import { isUnratedStarted } from '../unrated'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'title' | 'status'>): MediaItem {
  return {
    id: partial.title,
    listId: partial.listId ?? 'movies',
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'unknown',
    year: null,
    genres: [],
    why: '',
    notes: '',
    updatedAt: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    extra: {},
    ...partial,
  }
}

function titles(listId: ListId, rows: MediaItem[]) {
  return applyListQuery(rows, { ...DEFAULT_QUERY, unrated: true }, { now: new Date('2026-01-01T00:00:00.000Z'), listId }).map((entry) => entry.title)
}

describe('unrated', () => {
  it('keeps started titles with no rating and drops the not-started statuses', () => {
    const movies = [
      item({ title: 'Seen', status: 'Watched' }),
      item({ title: 'Halfway', status: 'In progress' }),
      item({ title: 'Left', status: 'Dropped' }),
      item({ title: 'Rated', status: 'Watched', myRating: 8 }),
      item({ title: 'Queue', status: 'Want to' }),
      item({ title: 'Marquee', status: 'Must watch' }),
      item({ title: 'Perhaps', status: ' Maybe ' }),
      item({ title: 'Blank', status: '' }),
    ]
    expect(titles('movies', movies)).toEqual(['Halfway', 'Left', 'Seen'])

    const series = [
      item({ listId: 'series', title: 'Some', status: 'Maybe later' }),
      item({ listId: 'series', title: 'Later season', status: 'Waiting for next season' }),
      item({ listId: 'series', title: 'New season', status: 'Next season out' }),
      item({ listId: 'series', title: 'Queued', status: 'Want to' }),
    ]
    expect(titles('series', series)).toEqual(['Later season', 'New season', 'Some'])
    expect(isUnratedStarted('anime', { status: 'Maybe later', myRating: null })).toBe(true)

    const books = [
      item({ listId: 'books', title: 'Open', status: 'Reading' }),
      item({ listId: 'books', title: 'Finished', status: 'Read' }),
      item({ listId: 'books', title: 'Shelf', status: 'Bought' }),
      item({ listId: 'books', title: 'Shop', status: 'Want to buy' }),
    ]
    expect(titles('books', books)).toEqual(['Finished', 'Open'])

    const games = [
      item({ listId: 'games', title: 'Now', status: 'Playing' }),
      item({ listId: 'games', title: 'Done', status: 'Completed' }),
      item({ listId: 'games', title: 'Someday', status: 'Want to' }),
    ]
    expect(titles('games', games)).toEqual(['Done', 'Now'])
  })

  it('still respects the other filters', () => {
    const rows = [
      item({ title: 'Drama', status: 'Watched', genres: ['Drama'] }),
      item({ title: 'Comedy', status: 'Watched', genres: ['Comedy'] }),
    ]
    const shown = applyListQuery(rows, { ...DEFAULT_QUERY, unrated: true, genres: ['Drama'] }, { now: new Date('2026-01-01T00:00:00.000Z'), listId: 'movies' })
    expect(shown.map((entry) => entry.title)).toEqual(['Drama'])
  })
})
