import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LIST_IDS, PICKS_IDS, TAB_NAME } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { routes } from '@/router'
import { listsCache } from '@/services/sheets/listsCache'

function lists(): ListsPayload {
  const book: MediaItem = {
    id: 'b1', listId: 'books', title: 'Dune', titleKey: 'dune', status: 'Reading', statusGroup: 'active',
    year: 1965, genres: [], why: '', notes: '', updatedAt: null, dateAdded: null, poster: null,
    creator: null, franchise: null, myRating: null, imdbRating: null, platform: null, favourite: false, extra: {},
  }
  const emptyLists = Object.fromEntries(LIST_IDS.map((id) => [id, id === 'books' ? [book] : []])) as unknown as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return { fetchedAt: '2026-01-01T00:00:00.000Z', dataHash: 'h', lists: emptyLists, picks, warnings: [], columns }
}

function ok(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'content-type': 'application/json' } }))
}

beforeEach(() => {
  localStorage.clear()
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Observer)
  window.matchMedia = ((query: string) => ({
    matches: query.includes('768'), media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as typeof window.matchMedia
  vi.stubGlobal('fetch', (input: RequestInfo) => {
    const url = String(input)
    if (url.includes('/api/auth/me')) {
      return ok({ user: { id: 'g', username: 'guest', role: 'guest', accountId: 'main' } })
    }
    if (url.includes('/api/lists')) return ok(lists())
    if (url.includes('/api/settings')) {
      return ok({ hardOff: false, picks: { enabled: false, movies: false, series: false, games: false }, effective: { movies: false, series: false, games: false }, lastRun: null })
    }
    return ok({})
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mount(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('routes', () => {
  it('sends a short list link to the list and keeps the query', async () => {
    const router = mount('/books?status=Reading')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Books' })).toBeTruthy())
    expect(router.state.location.pathname).toBe('/lists/books')
    expect(router.state.location.search).toBe('?status=Reading')
    expect(screen.getByRole('button', { name: 'Remove Reading' })).toBeTruthy()
  })

  it('renders the page 404 and the unknown-list 404', async () => {
    mount('/nope')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy())
    expect(screen.getByText('/nope')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Search for “nope”' })).toBeTruthy()
    cleanup()
    mount('/lists/nope')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'No list called “nope”' })).toBeTruthy())
    for (const id of LIST_IDS) expect(screen.getByRole('link', { name: TAB_NAME[id] })).toBeTruthy()
  })

  it('renders the home footer above the padded content', async () => {
    mount('/')
    await waitFor(() => expect(screen.getByRole('contentinfo')).toBeTruthy())
    expect(document.getElementById('content')?.className).toContain('md:pb-16')
  })

  it('keeps one loading bar from the auth check through the lists fetch', async () => {
    listsCache.clear()
    let releaseMe: (response: Response) => void = () => undefined
    const me = new Promise<Response>((resolve) => { releaseMe = resolve })
    let releaseLists: (response: Response) => void = () => undefined
    const pendingLists = new Promise<Response>((resolve) => { releaseLists = resolve })
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return me
      if (url.includes('/api/lists')) return pendingLists
      if (url.includes('/api/settings')) return ok({ hardOff: false, picks: { enabled: false, movies: false, series: false, games: false }, effective: { movies: false, series: false, games: false }, lastRun: null })
      return ok({})
    })
    mount('/')
    const bar = await screen.findByRole('progressbar', { name: 'Loading' })
    expect(bar.querySelector('.ml-top-bar')).toBeTruthy()
    releaseMe(new Response(JSON.stringify({ ok: true, data: { user: { id: 'g', username: 'guest', role: 'guest', accountId: 'main' } } }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Loading' })).toBe(bar))
    releaseLists(new Response(JSON.stringify({ ok: true, data: lists() }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await waitFor(() => expect(screen.getByRole('contentinfo')).toBeTruthy())
  })

  it('shows poster skeletons and then the cards on a cold list', async () => {
    listsCache.clear()
    let releaseLists: (response: Response) => void = () => undefined
    const pendingLists = new Promise<Response>((resolve) => { releaseLists = resolve })
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return ok({ user: { id: 'g', username: 'guest', role: 'guest', accountId: 'main' } })
      if (url.includes('/api/lists')) return pendingLists
      if (url.includes('/api/settings')) return ok({ hardOff: false, picks: { enabled: false, movies: false, series: false, games: false }, effective: { movies: false, series: false, games: false }, lastRun: null })
      return ok({})
    })
    mount('/movies')
    await waitFor(() => {
      const skeleton = document.querySelector('[data-slot="skeleton"]')
      expect(skeleton?.className).toContain('aspect-2/3')
    })
    const payload = lists()
    payload.lists.movies = [{
      id: 'movies:heat:1995', listId: 'movies', title: 'Heat', titleKey: 'heat', status: 'Watched', statusGroup: 'done',
      year: 1995, genres: [], why: '', notes: '', updatedAt: null, dateAdded: null, poster: null,
      creator: null, franchise: null, myRating: null, imdbRating: null, platform: null, favourite: false, extra: {},
    }]
    releaseLists(new Response(JSON.stringify({ ok: true, data: payload }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Heat/ })).toBeTruthy())
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
  })
})
