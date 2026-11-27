import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createElement, type ReactNode } from 'react'
import type { MediaItem } from '@/types/media'
import { useListViewPrefs } from '../useListViewPrefs'
import { catalogFrom, clearFiltersPatch, filterBadgeCount, parseStored, prefsKey, pruneQuery, queryToStored, readStoredQuery, resetViewPatch } from '../viewPrefs'
import { DEFAULT_QUERY } from '../filters/listQuery'

function book(extra: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'books:dune:1965',
    listId: 'books',
    title: 'Dune',
    titleKey: 'dune',
    status: 'Read',
    statusGroup: 'done',
    year: 1965,
    genres: ['Philosophy'],
    why: '',
    notes: '',
    updatedAt: null,
    poster: null,
    creator: 'Frank Herbert',
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    favourite: false,
    extra: {},
    ...extra,
  }
}

function wrap(path = '/lists/books') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [path] }, children)
  }
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})

describe('view prefs', () => {
  it('restores a list and ignores another list, invalid values, and corrupt JSON', () => {
    const stored = queryToStored({ ...DEFAULT_QUERY, view: 'shelves', sort: 'year', dir: 'desc', group: 'status', genres: ['Philosophy'], unrated: true })
    localStorage.setItem(prefsKey('books'), JSON.stringify(stored))
    localStorage.setItem(prefsKey('movies'), JSON.stringify(queryToStored({ ...DEFAULT_QUERY, view: 'table' })))
    expect(parseStored(JSON.parse(localStorage.getItem(prefsKey('books')) ?? 'null'), 'books').view).toBe('shelves')
    expect(parseStored(JSON.parse(localStorage.getItem(prefsKey('movies')) ?? 'null'), 'movies').view).toBe('table')
    expect(parseStored({ view: 'poster', sortBy: 'updated', groupBy: 'nope', toggles: { unrated: true }, filters: { genre: ['Philosophy'] } }, 'books').sort).toBe('title')
    expect(parseStored({ view: 'poster', sortBy: 'updated', groupBy: 'nope', toggles: { unrated: true }, filters: { genre: ['Philosophy'] } }, 'books').view).toBe('grid')
    expect(parseStored({ view: 'poster', sortBy: 'updated', groupBy: 'nope', toggles: { unrated: true }, filters: { genre: ['Philosophy'] } }, 'books').unrated).toBe(true)
    const catalog = catalogFrom([book()])
    expect(pruneQuery(parseStored({ filters: { genre: ['Philosophy', 'Gone'] } }, 'books'), catalog).genres).toEqual(['Philosophy'])
    expect(readStoredQuery('books', '{')).toEqual(DEFAULT_QUERY)
    expect(readStoredQuery('movies', null).view).toBe('grid')
  })

  it('clears filters without resetting the view, and reset view leaves filters', () => {
    const filters = clearFiltersPatch()
    const view = resetViewPatch()
    expect(filters).not.toHaveProperty('view')
    expect(filters).not.toHaveProperty('unrated')
    expect(filters.genres).toEqual([])
    expect(view.view).toBe('grid')
    expect(view.unrated).toBe(false)
    expect(view).not.toHaveProperty('genres')
    expect(filterBadgeCount({ ...DEFAULT_QUERY, genres: ['Philosophy'], unrated: true, sort: 'year' })).toBe(1)
  })

  it('persists and restores each list from the hook, and lets the URL win', () => {
    vi.useFakeTimers()
    localStorage.setItem(prefsKey('books'), JSON.stringify(queryToStored({ ...DEFAULT_QUERY, view: 'shelves', group: 'status', genres: ['Philosophy'] })))
    localStorage.setItem(prefsKey('movies'), JSON.stringify(queryToStored({ ...DEFAULT_QUERY, view: 'table' })))
    const books = renderHook(() => useListViewPrefs('books', [book()], true), { wrapper: wrap() })
    expect(books.result.current.query.view).toBe('shelves')
    expect(books.result.current.query.genres).toEqual(['Philosophy'])
    const movies = renderHook(() => useListViewPrefs('movies', [], true), { wrapper: wrap('/lists/movies') })
    expect(movies.result.current.query.view).toBe('table')
    act(() => {
      books.result.current.commit({ ...books.result.current.query, sort: 'year', dir: 'desc', q: 'dune' })
    })
    act(() => { vi.advanceTimersByTime(200) })
    const saved = JSON.parse(localStorage.getItem(prefsKey('books')) ?? '{}') as { sortBy?: string; filters?: { genre?: string[] } }
    expect(saved.sortBy).toBe('year')
    expect(saved.filters?.genre).toEqual(['Philosophy'])
    expect(JSON.stringify(saved)).not.toContain('dune')
    books.unmount()
    const linked = renderHook(() => useListViewPrefs('books', [book({ genres: ['Drama', 'Philosophy'] })], true), { wrapper: wrap('/lists/books?genre=Drama') })
    expect(linked.result.current.query.genres).toEqual(['Drama'])
  })
})
