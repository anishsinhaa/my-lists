import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useNavigate } from 'react-router-dom'
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
  const button = screen.getAllByRole('button', { name: 'Filters' }).find((entry) => entry.hasAttribute('aria-expanded'))
  if (button === undefined) throw new Error('Missing filters')
  return button
}

describe('filter chips', () => {
  it('gives the selected status a filled state and a check, and leaves the others off', () => {
    renderChrome()
    const maybe = chip('Maybe 0')
    const want = chip('Want to 0')
    expect(maybe.getAttribute('aria-pressed')).toBe('true')
    expect(maybe.className).toContain('bg-accent')
    expect(maybe.querySelectorAll('svg').length).toBe(2)
    expect(want.getAttribute('aria-pressed')).toBe('false')
    expect(want.className).not.toContain('bg-accent')
    expect(want.querySelectorAll('svg').length).toBe(1)
    expect(chip('All').getAttribute('aria-pressed')).toBe('false')
  })

  it('adds a status from the bar and can clear it', () => {
    const onChange = vi.fn()
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'shelves', statuses: ['Maybe'] }, onChange)
    fireEvent.click(chip('Want to 0'))
    expect(onChange).toHaveBeenCalledWith({ statuses: ['Maybe', 'Want to'] })
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
    fireEvent.click(screen.getByRole('button', { name: 'Year' }))
    expect(screen.getByLabelText('From year')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByLabelText('From year')).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Sort by' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(screen.queryByRole('button', { name: 'Sort by' })).toBeNull()
  })

  it('names the sort and can group with the same chips', () => {
    const onChange = vi.fn()
    const movie: MediaItem = {
      id: 'argo', listId: 'movies', title: 'Argo', titleKey: 'argo', status: 'Want to', statusGroup: 'planned',
      year: 2012, genres: ['Thriller'], why: '', updatedAt: null, poster: null, creator: 'Ben Affleck', franchise: null,
      myRating: null, imdbRating: null, platform: null, extra: {},
    }
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('radiogroup', { name: 'Sort by' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }))
    const sort = screen.getByRole('radiogroup', { name: 'Sort by' })
    expect(within(sort).getByRole('button', { name: 'Title A–Z' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(sort).getByRole('button', { name: 'Year' })).toBeTruthy()
    expect(within(sort).getByRole('button', { name: 'My Rating' })).toBeTruthy()
    expect(within(sort).getByRole('button', { name: 'IMDb rating' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    const grouped = screen.getByRole('radiogroup', { name: 'Group by' })
    expect(within(grouped).getByRole('button', { name: 'Status' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(grouped).getByRole('button', { name: 'Genre' }))
    expect(onChange).toHaveBeenCalledWith({ group: 'genre' })
    fireEvent.click(within(grouped).getByRole('button', { name: 'None' }))
    expect(onChange).toHaveBeenLastCalledWith({ group: 'none', view: 'grid' })
  })
})
