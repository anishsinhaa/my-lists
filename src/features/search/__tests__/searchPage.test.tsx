import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/themes/ThemeProvider'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { SearchPage } from '../SearchPage'

const state = vi.hoisted(() => ({
  ready: true,
  movies: [] as string[],
  books: [] as string[],
}))

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({
    data: state.ready ? {
      fetchedAt: '',
      dataHash: 'h',
      warnings: [],
      columns: {},
      picks: { 'movies-picks': [], 'series-picks': [], 'games-picks': [] },
      lists: {
        movies: state.movies.map((title) => row(title, 'movies')),
        series: [],
        anime: [],
        games: [],
        books: state.books.map((title) => row(title, 'books')),
        other: [],
        curious: [],
      },
    } : undefined,
    isLoading: !state.ready,
    isFetching: false,
    error: null,
    updatedAt: 0,
    refetch: async () => undefined,
  }),
}))

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ data: undefined }),
  usePicksVisibility: () => ({ any: false }),
}))

function row(title: string, listId: ListId): MediaItem {
  return {
    id: `${listId}:${title}`, listId, title, titleKey: title.toLowerCase(), status: 'Watched', statusGroup: 'done',
    year: null, genres: [], why: '', notes: '', updatedAt: null, dateAdded: null, poster: null, creator: null,
    franchise: null, myRating: null, imdbRating: null, platform: null, favourite: false, extra: {},
  }
}

function Location() {
  const location = useLocation()
  return <p>{location.pathname}{location.search}</p>
}

function mount(path: string, node: ReactNode = <SearchPage />) {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider themeId="home">
        <MemoryRouter initialEntries={[path]}>
          <Location />
          {node}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  state.ready = true
  state.movies = ['Dune']
  state.books = ['Dune: Part Two']
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => cleanup())

describe('search page', () => {
  it('asks for two letters, then writes the query and groups the hits', () => {
    mount('/search')
    expect(screen.getAllByText('Type at least 2 letters to search.').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByPlaceholderText('Search all your lists'), { target: { value: 'dune' } })
    expect(screen.getByText(/\/search\?q=dune/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Movies · 1' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Books · 1' })).toBeTruthy()
    expect(screen.getByText('2 results in 2 lists')).toBeTruthy()
  })

  it('shows results for a loaded query and expands one group', () => {
    state.movies = Array.from({ length: 9 }, (_, index) => `Dune ${index + 1}`)
    state.books = []
    mount('/search?q=dune')
    expect(screen.getByRole('heading', { name: 'Movies · 9' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Dune 9/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 9' }))
    expect(screen.getByRole('button', { name: /Dune 9/ })).toBeTruthy()
  })

  it('opens the next group from the keyboard', () => {
    mount('/search?q=dune')
    const input = screen.getByPlaceholderText('Search all your lists')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('heading', { name: 'Dune: Part Two' })).toBeTruthy()
  })

  it('shows skeletons while lists are loading and a miss when nothing matches', () => {
    state.ready = false
    mount('/search?q=dune')
    expect(screen.getByText('Loading lists')).toBeTruthy()
    cleanup()
    state.ready = true
    state.movies = []
    state.books = []
    mount('/search?q=naruto')
    expect(screen.getByText('No matches for “naruto”.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Movies' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Curious' })).toBeTruthy()
  })
})
