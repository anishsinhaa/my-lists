import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '@/types/media'
import { WallBoard } from '../WallBoard'
import type { WallTile } from '../wall'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'listId' | 'title'>): MediaItem {
  return {
    status: 'In progress',
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'active',
    year: 2012,
    genres: [],
    why: '',
    updatedAt: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    extra: {},
    ...partial,
    notes: partial.notes ?? '',
    favourite: partial.favourite ?? false,
  }
}

const tiles: WallTile[] = [
  {
    id: 'watching',
    title: 'Now watching',
    href: '/shelf/watching',
    items: [
      item({ id: 'anime:live', listId: 'anime', title: 'Live anime' }),
      item({ id: 'series:live', listId: 'series', title: 'Live show' }),
    ],
  },
]

describe('home wall posters', () => {
  beforeAll(() => {
    class Observer {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', Observer)
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
    })) as unknown as typeof window.matchMedia
  })

  it('opens the card on its shelf and each poster on that title’s category', () => {
    render(<MemoryRouter><WallBoard tiles={tiles} /></MemoryRouter>)
    const titles = screen.getAllByRole('link', { name: /Now watching/ })
    expect(titles.length).toBeGreaterThan(0)
    for (const link of titles) expect(link.getAttribute('href')).toBe('/shelf/watching')
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    for (const link of screen.getAllByRole('link', { name: 'Live anime' })) expect(link.getAttribute('href')).toBe('/lists/anime?item=anime%3Alive')
    for (const link of screen.getAllByRole('link', { name: 'Live show' })) expect(link.getAttribute('href')).toBe('/lists/series?item=series%3Alive')
  })
})
