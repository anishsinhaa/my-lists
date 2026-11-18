import { describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { SMART_VIEWS, TOP_RATED_MIN } from '../smartViews'
import { computeStats } from '../../stats/computeStats'

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
  }
}

describe('smart views and stats', () => {
  it('matches Nolan exactly and splits Marvel', () => {
    const rows = [
      item({ title: 'Inception', creator: 'Christopher Nolan', status: 'Watched', statusGroup: 'done' }),
      item({ title: 'Other', creator: 'Nolan Bushnell' }),
      item({ title: 'Iron Man', franchise: 'Marvel', status: 'Watched', statusGroup: 'done' }),
      item({ title: 'Ultron', franchise: 'MCU', status: 'Watched', statusGroup: 'done' }),
      item({ title: 'Next', franchise: 'Marvel Cinematic Universe', status: 'Want to', statusGroup: 'planned' }),
    ]
    const nolan = SMART_VIEWS.movies[0]?.apply(rows, { now: new Date() }) ?? []
    expect(nolan.map((row) => row.title)).toEqual(['Inception'])
    const marvel = SMART_VIEWS.movies.find((view) => view.id === 'marvel')
    const matched = marvel?.apply(rows, { now: new Date() }) ?? []
    expect(matched.filter((row) => marvel?.split?.left(row)).map((row) => row.title)).toEqual(['Iron Man', 'Ultron'])
    expect(matched.filter((row) => marvel?.split?.right(row)).map((row) => row.title)).toEqual(['Next'])
  })

  it('keeps a title when My Rating or the external rating is at least 8', () => {
    expect(TOP_RATED_MIN).toBe(8)
    const rows = [
      item({ title: 'Mine', myRating: 9, imdbRating: 5 }),
      item({ title: 'External', myRating: null, imdbRating: 8.4 }),
      item({ title: 'Low', myRating: 6, imdbRating: 9.5 }),
      item({ title: 'Empty', myRating: null, imdbRating: null }),
    ]
    const titles = SMART_VIEWS.movies.find((view) => view.id === 'top-rated')?.apply(rows, { now: new Date() }).map((row) => row.title)
    expect(titles).toEqual(['Low', 'Mine', 'External'])
    const stats = computeStats(rows)
    expect(stats.avgMyRating).toBe(7.5)
    expect(stats.myRatedCount).toBe(2)
    expect(stats.avgExternalRating).toBe(7.6)
    expect(stats.externalRatedCount).toBe(3)
    expect(stats.total).toBe(4)
  })

  it('orders Recently finished by Date finished', () => {
    const rows = [
      item({ title: 'Old', extra: { 'date finished': '2020-01-01' }, updatedAt: '2026-01-01T00:00:00.000Z' }),
      item({ title: 'New', extra: { 'date finished': '2024-06-01' }, updatedAt: '2019-01-01T00:00:00.000Z' }),
      item({ title: 'Blank', extra: { 'date finished': '' }, updatedAt: '2026-02-01T00:00:00.000Z' }),
    ]
    const view = SMART_VIEWS.movies.find((entry) => entry.id === 'recent')
    expect(view?.label).toBe('Recently finished')
    expect(view?.apply(rows, { now: new Date('2026-01-01T00:00:00.000Z') }).map((row) => row.title)).toEqual(['New', 'Old'])
  })
})
