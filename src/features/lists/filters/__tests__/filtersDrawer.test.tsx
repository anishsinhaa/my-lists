import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FilterChrome } from '../FilterChrome'
import { DEFAULT_QUERY } from '../listQuery'
import type { MediaItem } from '@/types/media'

function movie(partial: Partial<MediaItem> & Pick<MediaItem, 'title'>): MediaItem {
  return {
    id: partial.title,
    listId: 'movies',
    titleKey: partial.title.toLowerCase(),
    status: 'Want to',
    statusGroup: 'planned',
    year: 2010,
    genres: ['Drama'],
    why: '',
    notes: '',
    updatedAt: null,
    dateAdded: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    favourite: false,
    extra: {},
    ...partial,
  }
}

function filtersButton(): HTMLElement {
  const button = screen.getAllByRole('button', { name: /^Filters/ }).find((entry) => entry.hasAttribute('aria-expanded'))
  if (button === undefined) throw new Error('Missing filters')
  return button
}

afterEach(() => cleanup())

describe('filters drawer', () => {
  it('opens as a dialog, shows the three sections, and returns focus', async () => {
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={{ ...DEFAULT_QUERY, view: 'grid' }} shown={1} total={1} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings[0]).toContain('Filters & view')
    expect(headings.indexOf('View')).toBeLessThan(headings.indexOf('Show'))
    expect(headings.indexOf('Show')).toBeLessThan(headings.indexOf('Filters'))
    expect(screen.getAllByRole('button', { name: 'Close filters' })).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(filtersButton()))
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(filtersButton())
  })

  it('closes from the backdrop without clicking the card or changing the query', () => {
    const openCard = vi.fn()
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <button type="button" onClick={openCard}>Open card</button>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const overlay = document.querySelector('[data-slot="sheet-overlay"]')
    if (!(overlay instanceof HTMLElement)) throw new Error('Missing overlay')
    fireEvent.pointerDown(overlay)
    fireEvent.click(overlay)
    expect(openCard).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the view menu on an outside click without click-through', () => {
    const openCard = vi.fn()
    render(
      <MemoryRouter>
        <button type="button" onClick={openCard}>Open card</button>
        <FilterChrome items={[]} listId="movies" query={DEFAULT_QUERY} shown={0} total={0} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Grid view' }))
    expect(screen.getByRole('menuitem', { name: 'Table' })).toBeTruthy()
    const card = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Open card')
    if (card === undefined) throw new Error('Missing card')
    fireEvent.pointerDown(card)
    fireEvent.click(card)
    expect(screen.queryByRole('menuitem', { name: 'Table' })).toBeNull()
    expect(openCard).not.toHaveBeenCalled()
  })

  it('keeps filter groups collapsed until they have a selection and searches long lists', () => {
    const genres = ['Drama', ...Array.from({ length: 12 }, (_, index) => `Genre ${index}`)]
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat', genres })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const genre = screen.getByRole('button', { name: /Genre/ })
    expect(genre.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Drama' })).toBeNull()
    expect(screen.queryByLabelText('Search genres…')).toBeNull()
    cleanup()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat', genres })]} listId="movies" query={{ ...DEFAULT_QUERY, genres: ['Drama'] }} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const expanded = screen.getAllByRole('button').find((button) => button.getAttribute('aria-expanded') !== null && (button.textContent ?? '').includes('Genre'))
    expect(expanded?.getAttribute('aria-expanded')).toBe('true')
    const search = screen.getByLabelText('Search genres…')
    fireEvent.change(search, { target: { value: 'drama' } })
    expect(screen.getByRole('button', { name: 'Drama' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Genre 0' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
  })

  it('removes one chip at a time and keeps view, sort and group on clear all', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={{ ...DEFAULT_QUERY, view: 'shelves', sort: 'year', group: 'status', statuses: ['Want to'], genres: ['Drama'], addedWithin: '30d', yearMin: 2010 }} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Want to' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Drama' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Last 30 days' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove From 2010' }))
    expect(onChange).toHaveBeenNthCalledWith(1, { statuses: [] })
    expect(onChange).toHaveBeenNthCalledWith(2, { genres: [] })
    expect(onChange).toHaveBeenNthCalledWith(3, { addedWithin: 'any' })
    expect(onChange).toHaveBeenNthCalledWith(4, { yearMin: null, yearMax: null })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    const cleared = onChange.mock.calls.at(-1)?.[0] as Partial<typeof DEFAULT_QUERY>
    expect(cleared.view).toBeUndefined()
    expect(cleared.sort).toBeUndefined()
    expect(cleared.group).toBeUndefined()
    expect(cleared.statuses).toEqual([])
    expect(cleared.addedWithin).toBe('any')
  })
})
