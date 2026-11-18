import { describe, expect, it } from 'vitest'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { buildFillItems } from '../buildFillItems'

function movie(partial: Partial<MediaItem> & Pick<MediaItem, 'title' | 'titleKey'>): MediaItem {
  return {
    id: partial.titleKey,
    listId: 'movies',
    status: '',
    statusGroup: 'unknown',
    year: 2010,
    genres: [],
    why: '',
    updatedAt: null,
    poster: 'https://img.example/p.jpg',
    creator: 'Christopher Nolan',
    franchise: 'Nolan',
    myRating: null,
    imdbRating: 8,
    platform: null,
    extra: {},
    ...partial,
    notes: partial.notes ?? '',
  }
}

function payload(items: MediaItem[], columns = { poster: true, creator: true, franchise: true, imdbRating: true }): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, id === 'movies' ? items : []])) as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const allColumns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, columns])) as ListsPayload['columns']
  return { fetchedAt: '', dataHash: 'x', lists, picks, warnings: [], columns: allColumns }
}

describe('buildFillItems', () => {
  it('sends only empty poster and rating fields whose column exists', () => {
    expect(buildFillItems(payload([movie({ title: 'Full', titleKey: 'full' })]), 'movies')).toEqual([])
    const ratingOnly = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', imdbRating: null })]), 'movies')
    expect(ratingOnly[0]?.needs).toEqual(['imdbRating'])
    const noHeader = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', imdbRating: null })], { poster: true, creator: true, franchise: true, imdbRating: false }), 'movies')
    expect(noHeader).toEqual([])
    const bothOpen = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', poster: null, creator: null, franchise: null, imdbRating: null })]), 'movies')
    expect(bothOpen[0]?.needs).toEqual(['poster', 'imdbRating'])
    expect(buildFillItems(payload([]), 'other')).toEqual([])
  })
})
