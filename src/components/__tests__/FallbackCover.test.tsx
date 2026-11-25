import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FallbackCover } from '../FallbackCover'

afterEach(cleanup)

describe('FallbackCover', () => {
  it('centers one title with the author, and keeps the same palette for the same title', () => {
    const first = render(<FallbackCover kind="book" title="Dune" byline="Frank Herbert" />)
    expect(screen.getAllByText('Dune')).toHaveLength(1)
    expect(screen.getByText('Frank Herbert')).toBeTruthy()
    const cover = first.container.querySelector('[data-palette]')
    expect(cover?.className).toContain('items-center')
    expect(cover?.className).toContain('text-center')
    expect(cover?.getAttribute('data-palette')).toMatch(/^[0-7]$/)
    expect(first.container.querySelector('[data-spine]')).toBeTruthy()
    const again = render(<FallbackCover kind="book" title="Dune" byline="Frank Herbert" />)
    expect(again.container.querySelector('[data-palette]')?.getAttribute('data-palette')).toBe(cover?.getAttribute('data-palette'))
  })
})
