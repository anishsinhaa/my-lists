import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ListsPayload, MediaItem } from '@/types/media'
import { ShelfPage } from '../ShelfPage'

function row(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'listId' | 'title' | 'status'>): MediaItem {
  return {
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'active',
    year: 2012,
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

const data: ListsPayload = {
  fetchedAt: '',
  dataHash: '',
  warnings: [],
  columns: {} as ListsPayload['columns'],
  picks: { 'movies-picks': [], 'series-picks': [], 'games-picks': [] },
  lists: {
    movies: [row({ id: 'movies:live', listId: 'movies', title: 'Live film', status: 'In progress' })],
    series: [],
    anime: [row({ id: 'anime:live', listId: 'anime', title: 'Live anime', status: 'In progress' })],
    games: [],
    books: [],
    other: [],
    curious: [],
  },
}

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({ data, isLoading: false, error: null, refetch: () => undefined }),
}))

function mount(node: ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shelf/:tileId" element={node} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('cross-category shelf', () => {
  it('shows the same titles the home card counted, grouped by category', () => {
    mount(<ShelfPage />, '/shelf/watching')
    expect(screen.getByRole('heading', { name: 'Now watching' })).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Movies/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Anime/ })).toBeTruthy()
    expect(screen.getAllByText('Live film').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Live anime').length).toBeGreaterThan(0)
  })
})
