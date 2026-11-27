import { describe, expect, it } from 'vitest'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload, MediaItem, PickItem } from '@/types/media'
import { buildSearchIndex, searchIndex } from '../searchIndex'

function movie(title: string, extra: Partial<MediaItem> = {}): MediaItem {
  return {
    id: `movies:${title}`,
    listId: 'movies',
    title,
    titleKey: title.toLowerCase(),
    status: 'Watched',
    statusGroup: 'done',
    year: 2010,
    genres: ['Sci-fi'],
    why: '',
    notes: '',
    updatedAt: null,
    poster: null,
    creator: 'Christopher Nolan',
    franchise: null,
    myRating: null,
    imdbRating: 8.8,
    platform: null,
    extra: {},
    ...extra,
    dateAdded: extra.dateAdded ?? null,
    favourite: extra.favourite ?? false,
  }
}

function payload(lists: Partial<ListsPayload['lists']> = {}, picks: Partial<ListsPayload['picks']> = {}): ListsPayload {
  const emptyLists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  const emptyPicks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return {
    fetchedAt: '2026-01-01T00:00:00.000Z',
    dataHash: 'hash',
    lists: { ...emptyLists, ...lists },
    picks: { ...emptyPicks, ...picks },
    warnings: [],
    columns,
  }
}

describe('searchIndex', () => {
  it('finds a title despite a typo and keeps picks as a second hit', () => {
    const pick: PickItem = {
      id: 'movies-picks:inception::',
      picksId: 'movies-picks',
      targetList: 'movies',
      title: 'Inception',
      titleKey: 'inception',
      becauseYouLiked: 'Arrival',
      becauseKey: 'arrival',
      year: 2010,
      genres: [],
      status: '',
      why: '',
      poster: null,
    }
    const index = buildSearchIndex(payload(
      {
        movies: [movie('Inception')],
        books: [movie('Dune', { id: 'books:dune', listId: 'books', title: 'Dune' })],
        other: [movie('Notes', { id: 'other:notes', listId: 'other', title: 'Field notes' })],
        curious: [movie('Odd', { id: 'curious:odd', listId: 'curious', title: 'Oddity' })],
      },
      { 'movies-picks': [pick] },
    ))
    const hits = searchIndex(index, 'inceptoin')
    expect(hits.map((hit) => hit.source.kind)).toEqual(['item', 'pick'])
    expect(searchIndex(index, 'dune')[0]?.listId).toBe('books')
    expect(searchIndex(index, 'field').some((hit) => hit.listId === 'other')).toBe(true)
    expect(searchIndex(index, 'oddity').some((hit) => hit.listId === 'curious')).toBe(true)
    expect(searchIndex(index, 'i')).toEqual([])
    const mixed = buildSearchIndex(payload({ movies: [movie('Arcane', { genres: ['Fantasy', 'Action', 'Drama'] })] }))
    expect(searchIndex(mixed, 'action').map((hit) => hit.source.kind === 'item' ? hit.source.item.title : '')).toEqual(['Arcane'])
    expect(searchIndex(mixed, 'drama').map((hit) => hit.source.kind === 'item' ? hit.source.item.title : '')).toEqual(['Arcane'])
  })
})
