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
  it('renders exactly one rating chip at the bottom right', () => {
    render(<PosterCard index={0} item={movie()} />)
    expect(screen.getAllByText(/My rating/)).toHaveLength(1)
    expect(screen.getAllByText(/IMDb/)).toHaveLength(1)
    const chip = screen.getByText('IMDb 7.7').parentElement
    expect(chip?.className).toContain('bottom-16')
    expect(chip?.className).toContain('right-2')
    expect(chip?.className).not.toContain('left-2')
  })
})

describe('book cover hover', () => {
  it('lifts inside the card with no page strip, frame, or corner tab', () => {
    const book = movie()
    book.listId = 'books'
    book.id = 'books:dune:1965'
    const { container } = render(<BookCard index={0} item={book} />)
    const button = container.querySelector('button')
    const cover = container.querySelector('.book-cover')
    expect(button?.className).toContain('book-card')
    expect(button?.className).toContain('isolate')
    expect(button?.className).not.toContain('border')
    expect(cover?.className).not.toContain('border')
    expect(cover?.className).not.toContain('ring')
    expect(cover?.className).not.toContain('skew')
    expect(container.querySelector('.book-pages')).toBeNull()
    expect(container.querySelector('.book-face')).toBeTruthy()
    expect(container.querySelector('[data-spine]')).toBeNull()
    expect(container.innerHTML).not.toContain('clip-path')
    expect(container.innerHTML).not.toContain('rotateY')
  })
})
