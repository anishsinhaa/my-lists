import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MediaItem } from '@/types/media'
import { ItemModal } from '../ItemModal'
import { ListTable } from '../ListTable'

afterEach(cleanup)

function movie(patch: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'movies:argo:2012',
    listId: 'movies',
    title: 'Argo (2012)',
    titleKey: 'argo',
    status: 'Want to',
    statusGroup: 'planned',
    year: 2012,
    genres: ['Drama', 'Thriller'],
    why: '',
    updatedAt: '2020-01-01T00:00:00.000Z',
    poster: null,
    creator: 'Ben Affleck',
    franchise: null,
    myRating: null,
    imdbRating: 7.7,
    platform: null,
    extra: { 'date finished': '' },
    ...patch,
  }
}

describe('item details', () => {
  it('shows the note prompt, hides empty fields, and moves to the next title', () => {
    const onOpen = vi.fn()
    const second = movie({ id: 'movies:heat:1995', title: 'Heat', titleKey: 'heat', year: 1995 })
    render(<ItemModal item={movie()} items={[movie(), second]} listId="movies" onClose={() => undefined} onOpen={onOpen} onSave={vi.fn()} />)
    expect(screen.getByText("Why it's on my list")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add a note' })).toBeTruthy()
    expect(screen.queryByText('Why')).toBeNull()
    expect(screen.queryByText('Updated')).toBeNull()
    expect(screen.queryByText('–')).toBeNull()
    expect(screen.queryByText('Franchise')).toBeNull()
    expect(screen.getByText('Ben Affleck')).toBeTruthy()
    expect(screen.getByText('7.7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ title: 'Heat' }))
  })

  it('saves a status and can clear a rating', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { unmount } = render(<ItemModal item={movie({ myRating: 8 })} items={[movie({ myRating: 8 })]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Watched' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Argo (2012)' }), { status: 'Watched', myRating: 8 })
    unmount()
    onSave.mockClear()
    render(<ItemModal item={movie({ myRating: 8 })} items={[movie({ myRating: 8 })]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ myRating: 8 }), { status: 'Want to', myRating: null })
  })

  it('shows a poster, the notes on hover, and no updated column', () => {
    render(<ListTable items={[movie({ why: 'A long note about why this stayed on the list', franchise: 'None' })]} listId="movies" onOpen={() => undefined} />)
    expect(screen.getByRole('columnheader', { name: 'Poster' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Updated' })).toBeNull()
    const note = screen.getByTitle('A long note about why this stayed on the list')
    expect(note.className).toContain('truncate')
    expect(screen.getByRole('columnheader', { name: 'IMDb' })).toBeTruthy()
  })
})
