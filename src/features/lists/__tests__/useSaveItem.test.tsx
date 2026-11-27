import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { saveItem } from '@/services/sheets/itemApi'
import { fetchLists } from '@/services/sheets/listsApi'
import { LIST_IDS, PICKS_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { resetSaveLanes, useSaveItem } from '../useSaveItem'

vi.mock('@/services/sheets/itemApi', () => ({ saveItem: vi.fn() }))
vi.mock('@/services/sheets/listsApi', () => ({ fetchLists: vi.fn() }))
vi.mock('@/services/sheets/listsCache', () => ({ listsCache: { save: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function item(myRating: number | null = null): MediaItem {
  return {
    id: 'movies:argo:2012', listId: 'movies', title: 'Argo (2012)', titleKey: 'argo', status: 'Want to', statusGroup: 'planned',
    year: 2012, genres: [], why: '', notes: '', updatedAt: null, dateAdded: null, poster: null, creator: null, franchise: null, myRating, imdbRating: null, platform: null, favourite: false, extra: {},
  }
}

function payload(row: MediaItem): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, id === row.listId ? [row] : []])) as Record<ListId, MediaItem[]>
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  return { fetchedAt: '', dataHash: '', lists, picks, warnings: [], columns: {} as ListsPayload['columns'] }
}

describe('useSaveItem', () => {
  let client: QueryClient

  beforeEach(() => {
    resetSaveLanes()
    vi.mocked(saveItem).mockReset()
    vi.mocked(fetchLists).mockReset()
    client = new QueryClient()
    client.setQueryData(['lists'], payload(item()))
  })

  it('keeps the latest rating when a second change arrives before the first write finishes', async () => {
    const first = deferred<{ outcome: 'written' }>()
    const second = deferred<{ outcome: 'written' }>()
    vi.mocked(saveItem).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    vi.mocked(fetchLists).mockResolvedValue(payload(item(8)))
    const { result } = renderHook(() => useSaveItem(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => { void result.current(item(), { myRating: 9 }) })
    await act(async () => { void result.current(item(), { myRating: 8 }) })
    expect((client.getQueryData(['lists']) as ListsPayload).lists.movies[0]?.myRating).toBe(8)
    expect(saveItem).toHaveBeenCalledTimes(1)
    await act(async () => { first.resolve({ outcome: 'written' }) })
    await waitFor(() => expect(saveItem).toHaveBeenCalledTimes(2))
    expect(vi.mocked(saveItem).mock.calls[1]?.[0]).toEqual(expect.objectContaining({ myRating: 8, status: 'Want to' }))
    await act(async () => { second.resolve({ outcome: 'written' }) })
    await waitFor(() => expect(fetchLists).toHaveBeenCalledTimes(1))
  })

  it('shows a note immediately and restores it when the sheet write fails', async () => {
    let finish: (value: { outcome: 'not_found' }) => void = () => undefined
    vi.mocked(saveItem).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { result } = renderHook(() => useSaveItem(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => { void result.current(item(), { notes: 'Season 3' }).catch(() => undefined) })
    expect((client.getQueryData(['lists']) as ListsPayload).lists.movies[0]?.notes).toBe('Season 3')
    expect(saveItem).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Season 3', status: 'Want to' }))
    await act(async () => { finish({ outcome: 'not_found' }) })
    await waitFor(() => expect((client.getQueryData(['lists']) as ListsPayload).lists.movies[0]?.notes).toBe(''))
    expect(toast.error).toHaveBeenCalled()
  })

  it('shows a favourite immediately and restores it when the sheet write fails', async () => {
    let finish: (value: { outcome: 'not_found' }) => void = () => undefined
    vi.mocked(saveItem).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { result } = renderHook(() => useSaveItem(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await act(async () => { void result.current(item(), { favourite: true }).catch(() => undefined) })
    expect((client.getQueryData(['lists']) as ListsPayload).lists.movies[0]?.favourite).toBe(true)
    expect(saveItem).toHaveBeenCalledWith(expect.objectContaining({ favourite: true, status: 'Want to' }))
    await act(async () => { finish({ outcome: 'not_found' }) })
    await waitFor(() => expect((client.getQueryData(['lists']) as ListsPayload).lists.movies[0]?.favourite).toBe(false))
    expect(toast.error).toHaveBeenCalled()
  })
})
