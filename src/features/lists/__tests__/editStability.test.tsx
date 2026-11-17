import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLists } from '@/services/sheets/listsApi'
import { saveItem } from '@/services/sheets/itemApi'
import { LIST_IDS, PICKS_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { CategoryView } from '../CategoryView'
import { DEFAULT_QUERY } from '../filters/listQuery'
import { hasFinishedColumn, sortOptions } from '../sortOptions'
import { resetSaveLanes } from '../useSaveItem'

vi.mock('@/services/sheets/itemApi', () => ({ saveItem: vi.fn(async () => ({ outcome: 'written' })) }))
vi.mock('@/services/sheets/listsApi', () => ({ fetchLists: vi.fn() }))

function row(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'title'>): MediaItem {
  return {
    listId: 'movies', titleKey: partial.title.toLowerCase(), status: 'Watched', statusGroup: 'done', year: null,
    genres: [], why: '', updatedAt: null, poster: null, creator: null, franchise: null, myRating: null, imdbRating: null, platform: null, extra: {},
    ...partial,
  }
}

function payload(rows: MediaItem[]): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, id === 'movies' ? rows : []])) as Record<ListId, MediaItem[]>
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  return { fetchedAt: '', dataHash: '', lists, picks, warnings: [], columns: {} as ListsPayload['columns'] }
}

function Harness({ client, seed }: { client: QueryClient; seed: MediaItem[] }) {
  const [items, setItems] = useState(seed)
  useEffect(() => client.getQueryCache().subscribe(() => {
    const next = client.getQueryData<ListsPayload>(['lists'])?.lists.movies
    if (next !== undefined) setItems(next)
  }), [client])
  return (
    <CategoryView
      items={items}
      listId="movies"
      query={{ ...DEFAULT_QUERY, view: 'grid', statuses: ['Watched'] }}
      onChange={() => undefined}
    />
  )
}

function cardTitles(): string[] {
  const grid = document.querySelector('.grid')
  return [...(grid?.querySelectorAll('button') ?? [])]
    .map((button) => button.textContent ?? '')
    .flatMap((text) => text.includes('Alpha') ? ['Alpha'] : text.includes('Beta') ? ['Beta'] : [])
}

afterEach(() => cleanup())

describe('a rating edit stays put', () => {
  let top = 640

  beforeEach(() => {
    resetSaveLanes()
    top = 640
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => top })
    window.scrollTo = ((x: number | ScrollToOptions | undefined, y?: number) => {
      if (typeof y === 'number') top = y
      else if (typeof x === 'object' && typeof x.top === 'number') top = x.top
    }) as typeof window.scrollTo
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia
  })

  it('keeps the modal open, the scroll position, and the list order', async () => {
    const alpha = row({ id: 'alpha', title: 'Alpha', myRating: 9, updatedAt: '2020-01-01T00:00:00.000Z' })
    const beta = row({ id: 'beta', title: 'Beta', myRating: 6, updatedAt: '2024-01-01T00:00:00.000Z' })
    const client = new QueryClient()
    client.setQueryData(['lists'], payload([alpha, beta]))
    vi.mocked(fetchLists).mockResolvedValue(payload([{ ...beta, myRating: 10, updatedAt: '2026-11-18T00:00:00.000Z' }, alpha]))
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Harness client={client} seed={[alpha, beta]} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(cardTitles()).toEqual(['Alpha', 'Beta'])
    fireEvent.click(screen.getByRole('button', { name: /Beta/ }))
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Rate 10' }))
    expect(screen.getByText('Saved')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy()
    await waitFor(() => {
      const movies = (client.getQueryData(['lists']) as ListsPayload).lists.movies
      expect(movies.map((item) => item.title)).toEqual(['Alpha', 'Beta'])
      expect(movies[1]?.myRating).toBe(10)
      expect(movies[1]?.updatedAt).toBe('2026-11-18T00:00:00.000Z')
    })
    expect(cardTitles()).toEqual(['Alpha', 'Beta'])
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(false)
    expect(top).toBe(640)
    expect(saveItem).toHaveBeenCalled()
  })
})

describe('sort options', () => {
  it('never offers Updated at', () => {
    const labels = sortOptions('movies', false).map((option) => option.label)
    expect(labels).toEqual(['Title', 'Year', 'My Rating', 'IMDb rating'])
    expect(labels.join(' ')).not.toMatch(/updated/i)
    expect(sortOptions('games', false).map((option) => option.label)).toContain('Metacritic rating')
    expect(sortOptions('books', hasFinishedColumn('books', [])).map((option) => option.label)).toContain('Date finished')
    expect(sortOptions('series', true).map((option) => option.key)).toContain('finished')
    expect(hasFinishedColumn('books', [])).toBe(true)
    expect(hasFinishedColumn('movies', [row({ id: 'a', title: 'Alpha' })])).toBe(false)
    expect(hasFinishedColumn('movies', [row({ id: 'a', title: 'Alpha', extra: { 'date finished': '' } })])).toBe(true)
  })
})
