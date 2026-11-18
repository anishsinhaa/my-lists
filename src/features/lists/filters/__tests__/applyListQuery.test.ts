import { describe, expect, it } from 'vitest'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { applyListQuery } from '../applyListQuery'
import { DEFAULT_QUERY, type ListQuery } from '../listQuery'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'title'>): MediaItem {
  return {
    id: partial.title,
    listId: 'movies',
    titleKey: partial.title.toLowerCase(),
    status: '',
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
    favourite: partial.favourite ?? false,
  }
}

function run(items: MediaItem[], query: Partial<ListQuery>, listId?: ListId) {
  return applyListQuery(items, { ...DEFAULT_QUERY, ...query }, { now: new Date('2026-01-01T00:00:00.000Z'), listId }).map((entry) => entry.title)
}

describe('applyListQuery', () => {
  const rows = [
    item({ title: 'A', status: 'Watched', year: 2000, genres: ['Drama'], myRating: null, imdbRating: 8, updatedAt: '2020-01-01T00:00:00.000Z' }),
    item({ title: 'B', status: 'Want to', year: 2001, genres: ['Comedy'], myRating: 6, imdbRating: null, updatedAt: '2021-01-01T00:00:00.000Z' }),
    item({ title: 'C', status: 'Watched', year: null, genres: ['Drama'], myRating: 6, imdbRating: 9, updatedAt: null }),
    item({ title: 'D', status: 'Dropped', year: 1999, myRating: null, imdbRating: 5, updatedAt: '2019-01-01T00:00:00.000Z' }),
  ]

  it('matches any genre and searches every genre', () => {
    const mix = item({ title: 'Mix', genres: ['Fantasy', 'Action', 'Drama'] })
    expect(run([mix], { genres: ['Action'] })).toEqual(['Mix'])
    expect(run([mix], { genres: ['Comedy'] })).toEqual([])
    expect(run([mix], { q: 'drama' })).toEqual(['Mix'])
  })

  it('ORs statuses and ANDs other fields, with an inclusive year range', () => {
    expect(run(rows, { statuses: ['Watched', 'Dropped'], genres: ['Drama'] })).toEqual(['A', 'C'])
    expect(run(rows, { yearMin: 2000, yearMax: 2001 })).toEqual(['A', 'B'])
    expect(run(rows, { yearMin: 1990 })).not.toContain('C')
  })

  it('sorts effective rating with nulls last and lets My Rating win', () => {
    expect(run(rows, { sort: 'rating', dir: 'desc' })).toEqual(['A', 'B', 'C', 'D'])
    expect(run([rows[2]!], { ratingBy: 'my', ratingMin: 6 })).toEqual(['C'])
    expect(run([rows[0]!], { ratingBy: 'my', ratingMin: 1 })).toEqual([])
    expect(run([rows[0]!], { ratingBy: 'best', ratingMin: 8 })).toEqual(['A'])
  })

  it('keeps title order when a rating changes and sorts finished dates without using Updated at', () => {
    const rated = rows.map((row) => row.title === 'B' ? { ...row, myRating: 10, updatedAt: '2026-01-01T00:00:00.000Z' } : row)
    expect(run(rated, { sort: 'title', dir: 'asc' })).toEqual(['A', 'B', 'C', 'D'])
    const dated = [
      item({ title: 'Later', extra: { 'date finished': '2024-02-01' } }),
      item({ title: 'Earlier', extra: { 'date finished': '2020-05-01' } }),
      item({ title: 'Undated', extra: {} }),
    ]
    expect(run(dated, { sort: 'finished', dir: 'desc' })).toEqual(['Later', 'Earlier', 'Undated'])
  })

  it('sorts anime statuses with Paused right after In progress', () => {
    const rows = [
      item({ title: 'Hold', status: 'On hold', listId: 'anime' }),
      item({ title: 'Paused', status: 'Paused', listId: 'anime' }),
      item({ title: 'Season', status: 'Next season out', listId: 'anime' }),
      item({ title: 'Now', status: 'In progress', listId: 'anime' }),
    ]
    expect(run(rows, { sort: 'status', dir: 'asc' }, 'anime')).toEqual(['Now', 'Paused', 'Season', 'Hold'])
    expect(run(rows, { sort: 'status', dir: 'asc' })).toEqual(['Now', 'Season', 'Hold', 'Paused'])
  })

  it('keeps a stable order and logs a 500-item filter', () => {
    const many = Array.from({ length: 500 }, (_, index) => item({ title: `T${index}`, year: 2000 }))
    console.time('filter-500')
    const result = applyListQuery(many, DEFAULT_QUERY, { now: new Date() })
    console.timeEnd('filter-500')
    expect(result).toHaveLength(500)
    expect(result[0]?.title).toBe('T0')
  })
})
