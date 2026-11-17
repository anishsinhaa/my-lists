import { describe, expect, it } from 'vitest'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { buildFillItems } from '../buildFillItems'
import { markMiss } from '../negativeCache'

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
  }
}

function payload(items: MediaItem[], columns = { poster: true, creator: true, franchise: true, imdbRating: true }): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, id === 'movies' ? items : []])) as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const allColumns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, columns])) as ListsPayload['columns']
  return { fetchedAt: '', dataHash: 'x', lists, picks, warnings: [], columns: allColumns }
}

describe('buildFillItems', () => {
  it('sends only empty fields whose column exists and was not a recent miss', () => {
    localStorage.clear()
    expect(buildFillItems(payload([movie({ title: 'Full', titleKey: 'full' })]), 'movies', 1)).toEqual([])
    const ratingOnly = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', imdbRating: null })]), 'movies', 1)
    expect(ratingOnly[0]?.needs).toEqual(['imdbRating'])
    const noHeader = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', imdbRating: null })], { poster: true, creator: true, franchise: true, imdbRating: false }), 'movies', 1)
    expect(noHeader).toEqual([])
    markMiss('movies:heat:2010:imdbRating', 1)
    const posterOpen = buildFillItems(payload([movie({ title: 'Heat', titleKey: 'heat', poster: null, imdbRating: null })]), 'movies', 1)
    expect(posterOpen[0]?.needs).toEqual(['poster'])
    expect(buildFillItems(payload([]), 'other', 1)).toEqual([])
  })
})
