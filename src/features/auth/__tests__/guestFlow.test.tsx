import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload } from '@/types/media'
import { authService } from '@/services/auth/localTokenAuthService'
import { AuthProvider } from '../AuthProvider'
import { LoginPage } from '../LoginPage'
import { useAuth } from '../AuthContext'

const guest = { id: 'g1', username: 'guest', role: 'guest' as const, accountId: 'main' }

function lists(): ListsPayload {
  const emptyLists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return { fetchedAt: '2026-01-01T00:00:00.000Z', dataHash: 'h', lists: emptyLists, picks, warnings: [], columns }
}

function ok(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'content-type': 'application/json' } }))
}

function denied() {
  return Promise.resolve(new Response(JSON.stringify({ ok: false, error: { code: 'unauthorized', message: 'Sign in' } }), { status: 401, headers: { 'content-type': 'application/json' } }))
}

function Probe() {
  const { status } = useAuth()
  const location = useLocation()
  return <p>{status} {location.pathname}{location.search}</p>
}

function mount(from?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: from === undefined ? null : { from } }]}>
        <AuthProvider>
          <LoginPage />
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('guest sign-in', () => {
  it('does not call logout when the session probe is unauthorized', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('/api/auth/me')) return denied()
      return ok({})
    })
    mount()
    await waitFor(() => expect(screen.getByText(/anonymous \/login/)).toBeTruthy())
    expect(urls.some((url) => url.includes('/api/auth/logout'))).toBe(false)
  })

  it('keeps the guest button usable and ignores a late session probe', async () => {
    let finishMe: (response: Response) => void = () => undefined
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return new Promise<Response>((resolve) => { finishMe = resolve })
      if (url.includes('/api/auth/guest')) return ok({ expiresAt: '2099-01-01T00:00:00.000Z', user: guest })
      if (url.includes('/api/lists')) return ok(lists())
      return ok({})
    })
    mount('/lists/books')
    const button = screen.getByRole('button', { name: /Continue as guest/ })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByText('authenticated /lists/books')).toBeTruthy())
    finishMe(new Response(JSON.stringify({ ok: false, error: { code: 'unauthorized', message: 'Sign in' } }), { status: 401 }))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('authenticated /lists/books')).toBeTruthy()
  })

  it('times out a hung guest request and offers another try', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/auth/me') || url.includes('/api/auth/guest')) return new Promise(() => undefined)
      return ok({})
    })
    mount()
    fireEvent.click(screen.getByRole('button', { name: /Continue as guest/ }))
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(screen.getByText('The server is taking too long. Try again.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect((screen.getByRole('button', { name: /Continue as guest/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('waits for a pending logout before starting a guest session', async () => {
    const order: string[] = []
    let release: () => void = () => undefined
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      order.push(url)
      if (url.includes('/api/auth/logout')) {
        return new Promise<Response>((resolve) => { release = () => resolve(new Response(null, { status: 200 })) })
      }
      return ok({ expiresAt: '2099-01-01T00:00:00.000Z', user: guest })
    })
    const loggingOut = authService.logout()
    const guesting = authService.guest()
    await Promise.resolve()
    expect(order).toEqual(['/api/auth/logout'])
    release()
    await loggingOut
    await guesting
    expect(order).toEqual(['/api/auth/logout', '/api/auth/guest'])
  })

  it('honours a safe deep link and rejects an off-site one', async () => {
    vi.stubGlobal('fetch', (input: RequestInfo) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return denied()
      if (url.includes('/api/auth/guest')) return ok({ expiresAt: '2099-01-01T00:00:00.000Z', user: guest })
      if (url.includes('/api/lists')) return ok(lists())
      return ok({})
    })
    mount('/lists/books')
    await waitFor(() => expect(screen.getByText(/anonymous \/login/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Continue as guest/ }))
    await waitFor(() => expect(screen.getByText('authenticated /lists/books')).toBeTruthy())
    cleanup()
    mount('//evil.com')
    await waitFor(() => expect(screen.getByText(/anonymous \/login/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Continue as guest/ }))
    await waitFor(() => expect(screen.getByText('authenticated /')).toBeTruthy())
  })
})
