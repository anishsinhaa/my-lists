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
    notes: '',
    updatedAt: '2020-01-01T00:00:00.000Z',
    poster: null,
    creator: 'Ben Affleck',
    franchise: null,
    myRating: null,
    imdbRating: 7.7,
    platform: null,
    extra: { 'date finished': '' },
    ...patch,
    favourite: patch.favourite ?? false,
  }
}

describe('item details', () => {
  it('shows the note prompt, hides empty fields, and moves to the next title', () => {
    const onOpen = vi.fn()
    const second = movie({ id: 'movies:heat:1995', title: 'Heat', titleKey: 'heat', year: 1995 })
    render(<ItemModal item={movie()} items={[movie(), second]} listId="movies" onClose={() => undefined} onOpen={onOpen} onSave={vi.fn()} />)
    expect(screen.queryByText('About')).toBeNull()
    expect(screen.getByText('My notes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add a note, e.g. on Season 3' })).toBeTruthy()
    expect(screen.queryByText("Why it's on my list")).toBeNull()
    expect(screen.queryByText('Why')).toBeNull()
    expect(screen.queryByText('Updated')).toBeNull()
    expect(screen.getByText('Drama')).toBeTruthy()
    expect(screen.getByText('Thriller')).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }))
    fireEvent.click(screen.getByRole('button', { name: 'Watched' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Argo (2012)' }), { status: 'Watched' })
    unmount()
    onSave.mockClear()
    render(<ItemModal item={movie({ myRating: 8 })} items={[movie({ myRating: 8 })]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear rating' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ myRating: 8 }), { myRating: null })
  })

  it('previews a half star on hover and saves it', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ItemModal item={movie()} items={[movie()]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Rate 7.5' }))
    expect(document.querySelectorAll('[data-lit="full"]').length).toBe(7)
    expect(document.querySelector('[data-lit="half"]')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Rate 7.5' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Argo (2012)' }), { myRating: 7.5 })
  })

  it('shows About and My notes without a Why label', () => {
    render(<ItemModal item={movie({ why: 'A rescue in Tehran', notes: 'Watched the commentary' })} items={[movie()]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={vi.fn()} />)
    expect(screen.getByText('About')).toBeTruthy()
    expect(screen.getByText('A rescue in Tehran')).toBeTruthy()
    expect(screen.getByText('My notes')).toBeTruthy()
    expect(screen.getByText('Watched the commentary')).toBeTruthy()
    expect(screen.queryByText('Why')).toBeNull()
    const about = screen.getByText('About')
    const notes = screen.getByText('My notes')
    const status = screen.getByRole('button', { name: 'Change status' })
    expect(about.compareDocumentPosition(screen.getByText('Director')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Drama').compareDocumentPosition(screen.getByRole('button', { name: 'Rate 1' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rate 1' }).compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(notes.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('toggles a favourite for any status', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ItemModal item={movie()} items={[movie()]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    const heart = screen.getByRole('button', { name: 'Favourite' })
    expect(heart.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(heart)
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: 'Want to' }), { favourite: true })
  })

  it('saves a note on Enter and drops it on Escape', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<ItemModal item={movie()} items={[movie()]} listId="movies" onClose={() => undefined} onOpen={() => undefined} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a note, e.g. on Season 3' }))
    const field = screen.getByRole('textbox', { name: 'My notes' })
    fireEvent.change(field, { target: { value: 'On season 3' } })
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add a note, e.g. on Season 3' }))
    const again = screen.getByRole('textbox', { name: 'My notes' })
    fireEvent.change(again, { target: { value: 'On season 3' } })
    fireEvent.keyDown(again, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Argo (2012)' }), { notes: 'On season 3' })
  })

  it('marks a favourite in the table', () => {
    render(<ListTable items={[movie({ favourite: true })]} listId="movies" onOpen={() => undefined} />)
    expect(screen.getByLabelText('Favourite')).toBeTruthy()
  })

  it('shows a poster, the notes on hover, and no updated column', () => {
    render(<ListTable items={[movie({ notes: 'A long note about why this stayed on the list', franchise: 'None' })]} listId="movies" onOpen={() => undefined} />)
    expect(screen.getByRole('columnheader', { name: 'Poster' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'Updated' })).toBeNull()
    const note = screen.getByTitle('A long note about why this stayed on the list')
    expect(note.className).toContain('truncate')
    expect(screen.getByRole('columnheader', { name: 'IMDb' })).toBeTruthy()
  })
})
