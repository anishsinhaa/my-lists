import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_QUERY } from '../listQuery'
import { FilterChrome } from '../FilterChrome'

function chip(name: string): HTMLElement {
  const matches = screen.getAllByRole('button', { name })
  const found = matches[0]
  if (found === undefined) throw new Error(`Missing ${name}`)
  return found
}

afterEach(() => cleanup())

describe('filter chips', () => {
  it('gives the selected status a filled state and a check, and leaves the others off', () => {
    render(
      <FilterChrome
        items={[]}
        listId="movies"
        query={{ ...DEFAULT_QUERY, view: 'shelves', statuses: ['Maybe'] }}
        shown={1}
        total={2}
        onChange={() => undefined}
      />,
    )
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
    render(
      <FilterChrome
        items={[]}
        listId="movies"
        query={{ ...DEFAULT_QUERY, view: 'shelves', statuses: ['Maybe'] }}
        shown={1}
        total={2}
        onChange={onChange}
      />,
    )
    fireEvent.click(chip('Want to 0'))
    expect(onChange).toHaveBeenCalledWith({ statuses: ['Maybe', 'Want to'] })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ statuses: [], smart: null, q: '' }))
  })
})
