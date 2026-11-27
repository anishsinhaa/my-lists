import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload } from '@/types/media'
import { listsCache } from '@/services/sheets/listsCache'
import { useLists } from '../useLists'

function payload(dataHash: string): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return { fetchedAt: '2026-01-01T00:00:00.000Z', dataHash, lists, picks, warnings: [], columns }
}

function seed(savedAt: string) {
  const body = payload('cached')
  localStorage.setItem('ml.lists.v2', JSON.stringify({ savedAt, userId: 'user-1', dataHash: 'cached', payload: body }))
}

const auth = {
  user: { id: 'user-1', username: 'anish', role: 'owner', accountId: 'main' },
  status: 'authenticated',
  canEdit: true,
  login: async () => undefined,
  continueAsGuest: async () => undefined,
  logout: () => undefined,
} satisfies AuthContextValue

function Probe() {
  const first = useLists()
  const second = useLists()
  return <p>{first.data?.dataHash ?? 'empty'} {first.isLoading || second.isLoading ? 'loading' : 'ready'}</p>
}

function mount(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>{node}</AuthContext.Provider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  listsCache.clear()
})

afterEach(() => {
  cleanup()
  listsCache.clear()
  vi.unstubAllGlobals()
})

describe('useLists', () => {
  it('does not refetch a fresh cache for a second consumer', async () => {
    seed(new Date().toISOString())
    const fetchMock = vi.fn(() => new Promise(() => undefined))
    vi.stubGlobal('fetch', fetchMock)
    mount(<Probe />)
    expect(screen.getByText('cached ready')).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a stale cache immediately and revalidates once', async () => {
    seed(new Date(Date.now() - 120_000).toISOString())
    const fetchMock = vi.fn(() => new Promise(() => undefined))
    vi.stubGlobal('fetch', fetchMock)
    mount(<Probe />)
    expect(screen.getByText('cached ready')).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
