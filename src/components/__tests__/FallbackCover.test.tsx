import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { COVER_DARK, COVER_LIGHT, COVER_PAIRS, FallbackCover, contrastRatio, coverTextColor } from '../FallbackCover'

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
    expect(first.container.querySelector('[data-spine]')).toBeNull()
    expect(first.container.querySelector('[class*="border"]')).toBeNull()
    expect(first.container.querySelector('[data-sheen]')).toBeTruthy()
    const again = render(<FallbackCover kind="book" title="Dune" byline="Frank Herbert" />)
    expect(again.container.querySelector('[data-palette]')?.getAttribute('data-palette')).toBe(cover?.getAttribute('data-palette'))
  })

  it('keeps title and author at 4.5:1 on every palette pair', () => {
    for (const [from, to] of COVER_PAIRS) {
      const ink = coverTextColor(from, to)
      const mid = [0, 1, 2].map((index) => Math.round((Number.parseInt(from.slice(1 + index * 2, 3 + index * 2), 16) + Number.parseInt(to.slice(1 + index * 2, 3 + index * 2), 16)) / 2).toString(16).padStart(2, '0')).join('')
      for (const ground of [from, to, `#${mid}`]) expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(4.5)
      expect(ink === COVER_LIGHT || ink === COVER_DARK).toBe(true)
    }
  })
})
