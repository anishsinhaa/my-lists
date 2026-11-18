import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '@/types/media'
import { HomePosterLink } from '../HomePosterLink'
import { PREVIEW_DELAY, PREVIEW_HEIGHT, PREVIEW_WIDTH, previewBox } from '../previewBox'

function item(): MediaItem {
  return {
    id: 'anime:live',
    listId: 'anime',
    title: 'Live anime',
    titleKey: 'live anime',
    status: 'In progress',
    statusGroup: 'active',
    year: 2020,
    genres: ['Fantasy'],
    why: 'A first line\nThe rest stays hidden',
    notes: 'Paused at the cliffhanger',
    updatedAt: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: 9,
    imdbRating: 8.6,
    platform: null,
    favourite: false,
    extra: {},
  }
}

function media(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes('pointer: fine'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia
}

describe('home poster preview', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('stays inside the viewport', () => {
    const flipped = previewBox({ top: 700, left: 900, right: 980, bottom: 820 }, { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }, { width: 1000, height: 800 })
    expect(flipped.left).toBeGreaterThanOrEqual(8)
    expect(flipped.left + PREVIEW_WIDTH).toBeLessThanOrEqual(992)
    expect(flipped.top).toBeGreaterThanOrEqual(8)
    expect(flipped.top + PREVIEW_HEIGHT).toBeLessThanOrEqual(792)
  })

  it('opens a preview on a fine pointer after a short delay and keeps the poster link', () => {
    media(true)
    vi.useFakeTimers()
    render(<MemoryRouter><HomePosterLink href="/lists/anime?status=In+progress&item=anime%3Alive" item={item()} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Live anime' })
    expect(link.getAttribute('href')).toBe('/lists/anime?status=In+progress&item=anime%3Alive')
    fireEvent.mouseEnter(link.parentElement!)
    act(() => { vi.advanceTimersByTime(PREVIEW_DELAY - 1) })
    expect(screen.queryByTestId('poster-preview')).toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    const preview = screen.getByTestId('poster-preview')
    expect(preview.textContent).toContain('Fantasy')
    expect(preview.textContent).toContain('A first line')
    expect(preview.textContent).toContain('Paused at the cliffhanger')
    expect(preview.textContent).not.toContain('The rest stays hidden')
    fireEvent.mouseLeave(link.parentElement!)
    expect(screen.queryByTestId('poster-preview')).toBeNull()
  })

  it('does not preview on a coarse pointer', () => {
    media(false)
    vi.useFakeTimers()
    render(<MemoryRouter><HomePosterLink href="/lists/anime?status=In+progress&item=anime%3Alive" item={item()} /></MemoryRouter>)
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Live anime' }).parentElement!)
    act(() => { vi.advanceTimersByTime(PREVIEW_DELAY) })
    expect(screen.queryByTestId('poster-preview')).toBeNull()
  })
})
