import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { clearFiltersPatch } from '../../viewPrefs'
import { DEFAULT_QUERY } from '../listQuery'
import { FilterChrome } from '../FilterChrome'
import type { ListId } from '@/types/lists'
import type { ListQuery } from '../listQuery'

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
      <FilterChrome items={[]} listId={listId} query={query} shown={1} total={2} onChange={onChange} />
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

  it('opens the filters drawer and closes it from Done and Escape', () => {
    render(
      <MemoryRouter>
        <FilterChrome items={[]} listId="movies" query={{ ...DEFAULT_QUERY, view: 'grid' }} shown={1} total={2} onChange={() => undefined} />
      </MemoryRouter>,
    )
    fireEvent.click(filtersButton())
    expect(screen.getByRole('heading', { name: 'Filters & view' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'View' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('heading', { name: 'View' })).toBeNull()
    fireEvent.click(filtersButton())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('heading', { name: 'View' })).toBeNull()
  })

  it('puts sort and group in the drawer and keeps shelves grouped', () => {
    const onChange = vi.fn()
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('combobox', { name: 'Sort by' })).toBeNull()
    fireEvent.click(filtersButton())
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Group by' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Shelves' }))
    expect(onChange).toHaveBeenCalledWith({ view: 'shelves', group: 'status' })
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
    fireEvent.click(screen.getByRole('switch', { name: 'Unrated' }))
    expect(onChange).toHaveBeenCalledWith({ unrated: true })
    fireEvent.click(screen.getByRole('switch', { name: 'Fav Want to' }))
    expect(onChange).toHaveBeenCalledWith({ favWant: true })
    fireEvent.click(screen.getByRole('switch', { name: 'Fav Watched' }))
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
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings[0]).toBe('Filters & view · 1')
    expect(headings.indexOf('View')).toBeLessThan(headings.indexOf('Show'))
    expect(headings.indexOf('Show')).toBeLessThan(headings.indexOf('Filters'))
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeTruthy()
  })

  it('switches the view from one menu and closes it', () => {
    const onChange = vi.fn()
    renderChrome('movies', { ...DEFAULT_QUERY, view: 'grid' }, onChange)
    expect(screen.queryByRole('button', { name: 'Shelves' })).toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Grid view' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Table' }))
    expect(onChange).toHaveBeenCalledWith({ view: 'table', group: 'none' })
    expect(screen.queryByRole('menuitem', { name: 'Table' })).toBeNull()
  })
})
