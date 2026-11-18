import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { GlobalSearch } from '../GlobalSearch'
import { SearchDock } from '@/features/search/SearchDock'

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({
    data: {
      fetchedAt: '',
      dataHash: '',
      warnings: [],
      columns: {},
      picks: { 'movies-picks': [], 'series-picks': [], 'games-picks': [] },
      lists: {
        movies: [{
          id: 'movies:argo:2012', listId: 'movies', title: 'Argo', titleKey: 'argo', status: 'Want to', statusGroup: 'planned',
          year: 2012, genres: ['Thriller'], why: 'A rescue', notes: '', updatedAt: null, poster: null, creator: 'Ben Affleck', franchise: null,
          myRating: null, imdbRating: 7.7, platform: null, favourite: false, extra: {},
        }],
        series: [], anime: [], games: [], books: [], other: [], curious: [],
      },
    },
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

function mount(node: ReactNode) {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider themeId="home">
        <MemoryRouter>
          <Location />
          {node}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => cleanup())

describe('search opens the item on this page', () => {
  it('keeps the query when the modal closes, and can still open the list', () => {
    mount(<GlobalSearch />)
    const input = screen.getByPlaceholderText('Search movies, series, games...')
    fireEvent.change(input, { target: { value: 'argo' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('heading', { name: 'Argo' })).toBeTruthy()
    expect(screen.getByText('/')).toBeTruthy()
    expect(document.querySelector('[data-slot=dialog-content]')?.getAttribute('data-theme')).toBe('movies')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('heading', { name: 'Argo' })).toBeNull()
    expect((input as HTMLInputElement).value).toBe('argo')
    expect(screen.getByRole('button', { name: /Argo/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Argo/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open in list' }))
    expect(screen.getByText(/\/lists\/movies\?item=movies(%3A|:)argo(%3A|:)2012/)).toBeTruthy()
  })

  it('opens the same modal from the top-bar search', async () => {
    mount(<SearchDock />)
    await act(async () => { window.dispatchEvent(new Event('ml:search')) })
    const input = screen.getByPlaceholderText('Search movies, series, games...')
    fireEvent.change(input, { target: { value: 'argo' } })
    fireEvent.click(screen.getByRole('button', { name: /Argo/ }))
    expect(screen.getByRole('heading', { name: 'Argo' })).toBeTruthy()
    expect(screen.getByText('/')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open in list' })).toBeTruthy()
  })
})
