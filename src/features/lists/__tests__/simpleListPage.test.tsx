import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LIST_IDS } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { prefsKey } from '../viewPrefs'
import { SimpleListPage } from '../SimpleListPage'

function note(): MediaItem {
  return {
    id: 'curious:knots',
    listId: 'curious',
    title: 'Knots',
    titleKey: 'knots',
    status: 'Want to',
    statusGroup: 'planned',
    year: null,
    genres: [],
    why: '',
    notes: '',
    updatedAt: null,
    dateAdded: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    favourite: false,
    extra: { 'what it is': 'A short note about knots', type: 'Essay', source: 'Notebook' },
  }
}

function payload(): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  lists.curious = [note()]
  return { fetchedAt: '', dataHash: 'h', lists, picks: {} as ListsPayload['picks'], warnings: [], columns: {} as ListsPayload['columns'] }
}

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({ data: payload(), isLoading: false, error: null, refetch: () => undefined }),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('curious and other lists', () => {
  it('renders a note grid from a stored shelves view and has no pick button', () => {
    localStorage.setItem(prefsKey('curious'), JSON.stringify({
      view: 'shelves',
      sortBy: 'title',
      sortDir: 'asc',
      groupBy: 'none',
      filters: {},
      toggles: {},
    }))
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SimpleListPage listId="curious" />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Pick for tonight' })).toBeNull()
    expect(screen.getByText('Knots')).toBeTruthy()
    expect(screen.getByText('A short note about knots')).toBeTruthy()
    expect(screen.getByText('Essay')).toBeTruthy()
    expect(screen.getByText('Notebook')).toBeTruthy()
    expect(screen.getAllByText('Want to learn').length).toBeGreaterThan(0)
    expect(screen.queryByRole('radio', { name: 'Shelves view' })).toBeNull()
    expect(screen.getByRole('radio', { name: 'Grid view' }).getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('.curious-row')).toBeTruthy()
  })
})
