import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/themes/ThemeProvider'
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

function setMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

async function settleSheet() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
}

function openOverlay(): HTMLElement {
  const overlay = document.querySelector('[data-slot="sheet-overlay"]')
  if (!(overlay instanceof HTMLElement)) throw new Error('Missing overlay')
  return overlay
}

afterEach(() => {
  cleanup()
  delete document.body.dataset.theme
})

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

  it('closes from the backdrop without clicking the card or changing the query', async () => {
    const openCard = vi.fn()
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <button type="button" onClick={openCard}>Open card</button>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    await settleSheet()
    const overlay = openOverlay()
    fireEvent.pointerDown(overlay)
    fireEvent.click(overlay)
    expect(openCard).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('uses a layout toggle of radios', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <FilterChrome items={[]} listId="movies" query={DEFAULT_QUERY} shown={0} total={0} onChange={onChange} />
      </MemoryRouter>,
    )
    const grid = screen.getByRole('radio', { name: 'Grid view' })
    expect(grid.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Shelves view' }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(screen.getByRole('radio', { name: 'Shelves view' }))
    expect(onChange).toHaveBeenCalledWith({ view: 'shelves', group: 'status' })
    fireEvent.click(screen.getByRole('radio', { name: 'Table view' }))
    expect(onChange).toHaveBeenCalledWith({ view: 'table', group: 'none' })
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
    fireEvent.click(screen.getByRole('button', { name: 'Remove Want to watch' }))
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

  it('mirrors the theme onto body and the portalled drawer', () => {
    const view = render(
      <ThemeProvider themeId="books">
        <MemoryRouter>
          <FilterChrome items={[movie({ title: 'Heat' })]} listId="books" query={DEFAULT_QUERY} shown={1} total={1} onChange={() => undefined} />
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(document.body.dataset.theme).toBe('books')
    fireEvent.click(filtersButton())
    const content = document.querySelector('[data-slot="sheet-content"]')
    expect(content?.closest('[data-theme]')).toBeTruthy()
    view.unmount()
    expect(document.body.dataset.theme).toBeUndefined()
  })

  it('closes a touch on the phone backdrop without clicking the card', async () => {
    setMedia(false)
    const openCard = vi.fn()
    render(
      <MemoryRouter>
        <button type="button" onClick={openCard}>Open card</button>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    await settleSheet()
    const content = document.querySelector('[data-slot="sheet-content"]')
    expect(content?.className).toContain('max-h-[90dvh]')
    const overlay = openOverlay()
    fireEvent.pointerDown(overlay, { pointerType: 'touch' })
    fireEvent.click(overlay)
    expect(openCard).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes a mouse click on the desktop backdrop without clicking the card', async () => {
    setMedia(true)
    const openCard = vi.fn()
    render(
      <MemoryRouter>
        <button type="button" onClick={openCard}>Open card</button>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    await settleSheet()
    const content = document.querySelector('[data-slot="sheet-content"]')
    expect(content?.className).toContain('h-dvh')
    const overlay = openOverlay()
    fireEvent.pointerDown(overlay, { pointerType: 'mouse' })
    fireEvent.click(overlay)
    expect(openCard).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows Other statuses only when an item carries one', () => {
    render(
      <MemoryRouter>
        <FilterChrome items={[]} listId="other" query={DEFAULT_QUERY} shown={0} total={0} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /^Status/ })).toBeNull()
    cleanup()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Note', listId: 'other', status: 'Done' })]} listId="other" query={DEFAULT_QUERY} shown={1} total={1} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Status/ }))
    expect(within(dialog).getByRole('button', { name: 'Done 1' })).toBeTruthy()
  })

  it('stores Want to when the watch label is chosen', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Status/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Want to watch/ }))
    expect(onChange).toHaveBeenCalledWith({ statuses: ['Want to'] })
  })

  it('labels sort, group, layout, and direction', () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie({ title: 'Heat' })]} listId="movies" query={DEFAULT_QUERY} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('combobox', { name: 'Sort by' })).toBeTruthy()
    expect(within(dialog).getByRole('combobox', { name: 'Group by' }).textContent).toContain('No grouping')
    expect(within(dialog).getByText('Layout')).toBeTruthy()
    const direction = within(dialog).getByRole('button', { name: 'Sort direction: Ascending' })
    expect(direction.textContent).toContain('A–Z')
    fireEvent.click(direction)
    expect(onChange).toHaveBeenCalledWith({ dir: 'desc' })
  })
})
