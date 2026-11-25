import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload } from '@/types/media'
import { HomePage } from '../HomePage'

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'guest', username: 'Guest', role: 'guest', accountId: 'main' } }),
  useCanEdit: () => false,
}))

vi.mock('@/features/data/useLists', () => ({
  useLists: () => ({
    data: emptyLists(),
    isLoading: false,
    error: null,
    refetch: () => undefined,
  }),
}))

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ data: undefined }),
  usePicksVisibility: () => ({ any: true }),
}))

function emptyLists(): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  return { fetchedAt: '', dataHash: '', lists, picks, warnings: [], columns: {} as ListsPayload['columns'] }
}

afterEach(cleanup)

describe('home Add placeholder', () => {
  it('renders Add disabled with Coming soon and hides Picks', () => {
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
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    const add = screen.getByRole('button', { name: 'Add' })
    expect(add.hasAttribute('disabled')).toBe(true)
    expect(add.getAttribute('aria-disabled')).toBe('true')
    expect(add.getAttribute('title')).toBe('Coming soon')
    expect(add.className).toContain('opacity-50')
    expect(add.className).toContain('cursor-not-allowed')
    expect(screen.queryByRole('button', { name: 'Soon' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Picks' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Picks' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Pick for tonight' }).length).toBeGreaterThan(0)
  })
})
