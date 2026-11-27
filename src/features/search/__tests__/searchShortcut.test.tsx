import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { GlobalSearch } from '@/features/home/GlobalSearch'
import { SearchDock } from '../SearchDock'

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({
    data: {
      fetchedAt: '', dataHash: '', warnings: [], columns: {},
      picks: { 'movies-picks': [], 'series-picks': [], 'games-picks': [] },
      lists: {
        movies: [{
          id: 'movies:argo:2012', listId: 'movies', title: 'Argo', titleKey: 'argo', status: 'Want to', statusGroup: 'planned',
          year: 2012, genres: ['Thriller'], why: '', notes: '', updatedAt: null, dateAdded: null, poster: null, creator: 'Ben Affleck',
          franchise: null, myRating: null, imdbRating: 7.7, platform: null, favourite: false, extra: {},
        }],
        series: [], anime: [], games: [], books: [], other: [], curious: [],
      },
    },
    isLoading: false, isFetching: false, error: null, updatedAt: 0, refetch: async () => undefined,
  }),
}))

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ data: undefined }),
  usePicksVisibility: () => ({ any: false }),
}))

function Location() {
  const location = useLocation()
  return <p>{location.pathname}{location.search}</p>
}

function Leave() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate('/lists')}>Leave</button>
}

function mount(path: string, node: ReactNode) {
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
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => cleanup())

describe('search shortcut', () => {
  it('opens the dock from slash on a list and swallows the outside click', () => {
    const spy = vi.fn()
    mount('/lists/movies', <><SearchDock /><button type="button" onClick={spy}>Under</button><Leave /></>)
    fireEvent.keyDown(window, { key: '/' })
    expect(screen.getByPlaceholderText('Search movies, series, games...')).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Under' }))
    fireEvent.click(screen.getByRole('button', { name: 'Under' }))
    expect(spy).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('Search movies, series, games...')).toBeNull()
  })

  it('focuses the page field on home and on search, and ignores inputs and modifiers', () => {
    mount('/', <><GlobalSearch /><SearchDock /></>)
    fireEvent.keyDown(window, { key: '/' })
    expect(document.activeElement?.id).toBe('global-search')
    expect(document.getElementById('top-search')).toBeNull()
    cleanup()
    mount('/search', <><input id="search-page-input" /><SearchDock /></>)
    fireEvent.keyDown(window, { key: '/' })
    expect(document.activeElement?.id).toBe('search-page-input')
    expect(document.getElementById('top-search')).toBeNull()
    cleanup()
    mount('/lists/movies', <SearchDock />)
    const field = document.createElement('input')
    document.body.appendChild(field)
    fireEvent.keyDown(field, { key: '/' })
    expect(document.getElementById('top-search')).toBeNull()
    fireEvent.keyDown(window, { key: '/', ctrlKey: true })
    expect(document.getElementById('top-search')).toBeNull()
    field.remove()
  })

  it('closes on navigation and can open the full search page', () => {
    mount('/lists/movies', <><SearchDock /><Leave /></>)
    fireEvent.keyDown(window, { key: '/' })
    fireEvent.change(screen.getByPlaceholderText('Search movies, series, games...'), { target: { value: 'argo' } })
    fireEvent.click(screen.getByRole('button', { name: 'See all results for “argo”' }))
    expect(screen.getByText('/search?q=argo')).toBeTruthy()
    expect(document.getElementById('top-search')).toBeNull()
    cleanup()
    mount('/lists/movies', <><SearchDock /><Leave /></>)
    fireEvent.keyDown(window, { key: '/' })
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(document.getElementById('top-search')).toBeNull()
  })
})
