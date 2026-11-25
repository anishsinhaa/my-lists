import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { BookCard } from '../../cards/BookCard'
import { PosterCard } from '../PosterCard'

afterEach(cleanup)

function movie(): MediaItem {
  return {
    id: 'movies:heat:1995',
    listId: 'movies',
    title: 'Heat',
    titleKey: 'heat',
    status: 'Watched',
    statusGroup: 'done',
    year: 1995,
    genres: [],
    why: '',
    notes: '',
    updatedAt: null,
    poster: 'https://img.example/heat.jpg',
    creator: 'Michael Mann',
    franchise: null,
    myRating: 8,
    imdbRating: 7.7,
    platform: null,
    favourite: false,
    extra: {},
  }
}

describe('poster rating chip', () => {
  it('renders exactly one rating chip at the top right', () => {
    render(<PosterCard index={0} item={movie()} />)
    expect(screen.getAllByText(/My rating/)).toHaveLength(1)
    expect(screen.getAllByText(/IMDb/)).toHaveLength(1)
    const chip = screen.getByText('IMDb 7.7').parentElement
    expect(chip?.className).toContain('top-2')
    expect(chip?.className).toContain('right-2')
    expect(chip?.className).not.toContain('bottom-')
  })
})

describe('book cover hover', () => {
  it('lifts and opens inside the card instead of sliding into the next cell', () => {
    const book = movie()
    book.listId = 'books'
    book.id = 'books:dune:1965'
    const { container } = render(<BookCard index={0} item={book} />)
    const button = container.querySelector('button')
    const open = container.querySelector('[class*="rotateY"]')
    expect(button?.className).toContain('isolate')
    expect(button?.className).not.toContain('perspective')
    expect(open?.className).toContain('rotateY(-12deg)')
    expect(open?.className).toContain('translateY(-4px)')
    expect(open?.className).toContain('scale(1.02)')
    expect(open?.className).toContain('origin-[left_center]')
    expect(open?.className).not.toContain('translateX')
    expect(open?.className).not.toContain('skew')
    expect(container.querySelector('[class*="perspective:1000px"]')).toBeTruthy()
    expect(container.innerHTML).not.toContain('clip-path')
  })
})
