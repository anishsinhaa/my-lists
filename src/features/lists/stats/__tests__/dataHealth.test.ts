import { describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { dataHealth } from '../dataHealth'

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
    dateAdded: partial.dateAdded ?? null,
    favourite: partial.favourite ?? false,
  }
}

describe('dataHealth', () => {
  it('counts missing posters, ratings, creators, and franchises', () => {
    const health = dataHealth([
      item({ title: 'Full', poster: 'https://img.example/a.jpg', creator: 'Nolan', franchise: 'Marvel', imdbRating: 8 }),
      item({ title: 'Empty', poster: '  ', creator: '', franchise: '', imdbRating: null }),
    ])
    expect(health).toEqual({ posters: 1, ratings: 1, creators: 1, franchises: 1 })
  })
})
