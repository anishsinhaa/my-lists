import { describe, expect, it } from 'vitest'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListId } from '@/types/lists'
import type { ListsPayload, MediaItem, PickItem } from '@/types/media'
import { buildSearchIndex, groupHits, searchIndex } from '../searchIndex'

function movie(title: string, listId: ListId = 'movies', extra: Partial<MediaItem> = {}): MediaItem {
  return {
    id: `${listId}:${title}`,
    listId,
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
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: 8,
    platform: null,
    extra: {},
    dateAdded: null,
    favourite: false,
    ...extra,
  }
}

function payload(items: MediaItem[], picks: PickItem[] = []): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, items.filter((item) => item.listId === id)])) as unknown as ListsPayload['lists']
  const emptyPicks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return {
    fetchedAt: '2026-01-01T00:00:00.000Z',
    dataHash: 'hash',
    lists,
    picks: { ...emptyPicks, 'movies-picks': picks },
    warnings: [],
    columns,
  }
}

function titles(query: string, items: MediaItem[], picks: PickItem[] = []): string[] {
  return searchIndex(buildSearchIndex(payload(items, picks)), query).map((hit) => hit.source.item.title)
}

describe('searchIndex', () => {
  const pick: PickItem = {
    id: 'movies-picks:inception',
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
  const items = [
    movie('Dune'),
    movie('Dune: Part Two'),
    movie('Dunkirk'),
    movie('Slam Dunk'),
    movie('Midtown Madness'),
    movie('The Office (US)', 'series'),
    movie('The Paper', 'series'),
    movie('X-Men: First Class'),
    movie('Mad Men', 'series'),
    movie('12 Angry Men', 'books'),
    movie('One Piece', 'anime'),
    movie('Prisoners'),
    movie('Days Gone', 'games'),
    movie('Inception', 'movies', { creator: 'Christopher Nolan' }),
  ]

  it('keeps exact and prefix matches and drops fuzzy noise', () => {
    expect(titles('dune', items)).toEqual(['Dune', 'Dune: Part Two'])
    const office = titles('the office', items)
    expect(office[0]).toBe('The Office (US)')
    expect(office).not.toContain('The Paper')
    expect(titles('x men', items)).toEqual(['X-Men: First Class'])
    expect(titles('xmen', items)).toEqual(['X-Men: First Class'])
    expect(titles('one', items)).toEqual(['One Piece'])
    expect(titles('naruto', items)).toEqual([])
    expect(titles('i', items)).toEqual([])
    const nolan = searchIndex(buildSearchIndex(payload(items, [pick])), 'nolan')
    expect(nolan.map((hit) => hit.source.item.title)).toEqual(['Inception'])
    expect(nolan[0]?.rank).toBe(4)
    const inception = searchIndex(buildSearchIndex(payload(items, [pick])), 'inception')
    expect(inception.map((hit) => hit.source.kind)).toEqual(['item', 'pick'])
  })

  it('orders groups by their best hit', () => {
    const groups = groupHits(searchIndex(buildSearchIndex(payload(items)), 'men', 20))
    expect(groups.map((group) => group.listId)).toEqual(['series', 'books', 'movies'])
    expect(groups[0]?.hits.map((hit) => hit.source.item.title)).toEqual(['Mad Men'])
  })
})
