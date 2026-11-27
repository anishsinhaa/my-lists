import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { clearFiltersPatch } from '../../viewPrefs'
import { DEFAULT_QUERY } from '../listQuery'
import { FilterChrome } from '../FilterChrome'
import type { ListId } from '@/types/lists'
import type { ListQuery } from '../listQuery'
import type { MediaItem } from '@/types/media'

function chip(name: string): HTMLElement {
  const matches = screen.getAllByRole('button', { name })
  const found = matches[0]
  if (found === undefined) throw new Error(`Missing ${name}`)
  return found
}

afterEach(() => cleanup())

function renderChrome(listId: ListId = 'movies', query: ListQuery = { ...DEFAULT_QUERY, view: 'shelves', statuses: ['Maybe'] }, onChange = () => undefined) {
  return render(
    <MemoryRouter>
      <FilterChrome items={[] as MediaItem[]} listId={listId} query={query} shown={1} total={2} onChange={onChange} />
    </MemoryRouter>,
  )
}

function filtersButton(): HTMLElement {
  const button = screen.getAllByRole('button', { name: /^Filters/ }).find((entry) => entry.hasAttribute('aria-expanded'))
  if (button === undefined) throw new Error('Missing filters')
  return button
}

describe('filter chips', () => {
  it('leaves status to the counts on movies, series, anime, and games', () => {
    for (const listId of ['movies', 'series', 'anime', 'games'] as const) {
      renderChrome(listId)
      expect(screen.queryByRole('group', { name: 'Status' })).toBeNull()
      cleanup()
    }
  })

  it('keeps the status row where the counts do not already filter', () => {
    renderChrome('books', { ...DEFAULT_QUERY, view: 'shelves', statuses: ['Reading'] })
    const reading = chip('Reading 0')
    expect(reading.getAttribute('aria-pressed')).toBe('true')
    expect(reading.className).toContain('bg-accent')
    expect(chip('Want to buy 0').getAttribute('aria-pressed')).toBe('false')
  })

  it('adds a status from the bar and can clear it', () => {
    const onChange = vi.fn()
    renderChrome('books', { ...DEFAULT_QUERY, view: 'shelves', statuses: ['Reading'] }, onChange)
    fireEvent.click(chip('Want to buy 0'))
    expect(onChange).toHaveBeenCalledWith({ statuses: ['Reading', 'Want to buy'] })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ statuses: [], smart: null, q: '' }))
  })

  it('closes the filter panel on an outside click, Escape, and a route change', () => {
    function Probe() {
      const navigate = useNavigate()
      return (
        <>
          <button type="button" onClick={() => navigate('/lists/anime')}>Leave</button>
          <FilterChrome items={[]} listId="movies" query={{ ...DEFAULT_QUERY, view: 'grid' }} shown={1} total={2} onChange={() => undefined} />
        </>
      )
    }
    render(<MemoryRouter initialEntries={['/lists/movies']}><Probe /></MemoryRouter>)
    fireEvent.click(filtersButton())
    expect(screen.getByRole('heading', { name: 'View' })).toBeTruthy()
    expect(screen.getByLabelText('From year')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByLabelText('From year')).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('heading', { name: 'View' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(screen.queryByRole('heading', { name: 'View' })).toBeNull()
  })

  it('names the sort and can group with the same chips', () => {
    const onChange = vi.fn()
    const movie: MediaItem = {
      id: 'argo', listId: 'movies', title: 'Argo', titleKey: 'argo', status: 'Want to', statusGroup: 'planned',
      year: 2012, genres: ['Thriller'], why: '', notes: '', updatedAt: null, poster: null, creator: 'Ben Affleck', franchise: null,
      myRating: null, imdbRating: null, platform: null, favourite: false, extra: {},
    }
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('radiogroup', { name: 'Sort by' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Sort by' })).getByRole('button', { name: 'Year' }))
    expect(onChange).toHaveBeenCalledWith({ sort: 'year', dir: 'desc' })
    cleanup()
    onChange.mockClear()
    render(
      <MemoryRouter>
        <FilterChrome items={[movie]} listId="movies" query={{ ...DEFAULT_QUERY, view: 'shelves', group: 'status' }} shown={1} total={1} onChange={onChange} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    const sort = screen.getByRole('radiogroup', { name: 'Sort by' })
    expect(within(sort).getByRole('button', { name: 'Title A–Z' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(sort).getByRole('button', { name: 'Year' })).toBeTruthy()
    expect(within(sort).getByRole('button', { name: 'My Rating' })).toBeTruthy()
    expect(within(sort).getByRole('button', { name: 'IMDb rating' })).toBeTruthy()
    const grouped = screen.getByRole('radiogroup', { name: 'Group by' })
    expect(within(grouped).getByRole('button', { name: 'Status' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(grouped).getByRole('button', { name: 'Genre' }))
    expect(onChange).toHaveBeenCalledWith({ group: 'genre' })
    fireEvent.click(within(grouped).getByRole('button', { name: 'None' }))
    expect(onChange).toHaveBeenLastCalledWith({ group: 'none', view: 'grid' })
  })

  it('clears every filter from the panel and stays disabled when nothing is set', () => {
    const onChange = vi.fn()
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    fireEvent.click(filtersButton())
    expect((screen.getByRole('button', { name: 'Clear filters' }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    renderChrome('movies', {
      ...DEFAULT_QUERY,
      view: 'shelves',
      statuses: ['Watched'],
      genres: ['Drama'],
      yearMin: 1990,
      q: 'heat',
      smart: 'nolan',
      poster: 'missing',
      creator: 'Nolan',
      ratingMin: 8,
      ratingBy: 'my',
    }, onChange)
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onChange).toHaveBeenCalledWith(clearFiltersPatch())
    expect(onChange.mock.calls[0]?.[0]).not.toHaveProperty('q')
    expect(onChange.mock.calls[0]?.[0]).not.toHaveProperty('unrated')
  })

  it('turns Unrated on, counts it, and clears it with the other filters', () => {
    const onChange = vi.fn()
    renderChrome('series', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('button', { name: 'Filters 1' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Unrated' }))
    expect(onChange).toHaveBeenCalledWith({ unrated: true })
    fireEvent.click(screen.getByRole('button', { name: 'Fav Want to' }))
    expect(onChange).toHaveBeenCalledWith({ favWant: true })
    fireEvent.click(screen.getByRole('button', { name: 'Fav Watched' }))
    expect(onChange).toHaveBeenCalledWith({ favWatched: true })
    cleanup()
    onChange.mockClear()
    renderChrome('series', { ...DEFAULT_QUERY, view: 'grid', unrated: true }, onChange)
    expect(screen.queryByRole('button', { name: 'Filters 1' })).toBeNull()
    expect(document.querySelector('[data-view-custom="true"]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Unrated' }))
    expect(onChange).toHaveBeenCalledWith({ unrated: false })
    fireEvent.click(filtersButton())
    expect((screen.getByRole('button', { name: 'Clear filters' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders View and Filters as separate sections and counts only filters', () => {
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'shelves', genres: ['Drama'], unrated: true, sort: 'year' })
    expect(screen.getAllByRole('button', { name: 'Filters 1' }).length).toBeGreaterThan(0)
    fireEvent.click(filtersButton())
    expect(screen.getByRole('heading', { name: 'View' })).toBeTruthy()
    expect(screen.getByText('How the list looks')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Filters · 1' })).toBeTruthy()
    expect(screen.getByText("Narrow down what's shown")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeTruthy()
  })

  it('switches the view from one menu and closes it', () => {
    const onChange = vi.fn()
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('button', { name: 'Shelves' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }))
    const current = screen.getAllByRole('button', { name: 'Grid' }).find((button) => button.getAttribute('aria-pressed') === 'true')
    expect(current).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(onChange).toHaveBeenCalledWith({ view: 'table', group: 'none' })
    expect(screen.queryByRole('button', { name: 'Table' })).toBeNull()
  })
})
