import { describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { focusGroup, itemGroups } from '../itemGroups'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'title'>): MediaItem {
  return {
    id: partial.title,
    listId: 'movies',
    titleKey: partial.title.toLowerCase(),
    status: 'Want to',
    statusGroup: 'planned',
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
    favourite: partial.favourite ?? false,
  }
}

describe('item groups', () => {
  const rows = [
    item({ title: 'Argo', year: 2012, genres: ['Thriller'], creator: 'Ben Affleck', status: 'Want to' }),
    item({ title: 'Arrival', year: 2016, genres: ['Sci-Fi', 'Thriller'], creator: 'Denis Villeneuve', status: 'Watched' }),
    item({ title: 'Old', year: 1999, genres: ['Drama'], status: 'Watched' }),
    item({ title: 'Untitled', status: 'Watched' }),
  ]

  it('reuses status shelves and keeps every title', () => {
    const groups = itemGroups('movies', rows, 'status')
    expect(groups.map((group) => group.status)).toEqual(['Want to', 'Watched'])
    expect(groups.find((group) => group.status === 'Watched')?.items).toHaveLength(3)
  })

  it('groups a title into each of its genres, decades, and creators', () => {
    expect(itemGroups('movies', rows, 'genre').map((group) => [group.status, group.total])).toEqual([['Thriller', 2], ['Drama', 1], ['Sci-Fi', 1], ['No genre', 1]])
    expect(itemGroups('movies', rows, 'genre').find((group) => group.status === 'Thriller')?.items.map((row) => row.title)).toEqual(['Argo', 'Arrival'])
    expect(itemGroups('movies', rows, 'year').map((group) => group.status)).toEqual(['2010s', '1990s', 'No year'])
    expect(itemGroups('movies', rows, 'creator').find((group) => group.loose)?.status).toBe('No director')
    expect(focusGroup('year', '2010s', false)).toEqual({ group: 'none', view: 'grid', yearMin: 2010, yearMax: 2019 })
    expect(focusGroup('genre', 'No genre', true)).toBeNull()
    expect(focusGroup('status', 'Watched', false)?.statuses).toEqual(['Watched'])
  })
})