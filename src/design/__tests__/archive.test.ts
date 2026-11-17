import { describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { edgeScrollSpeed, shelfGroups, currentItems, thumbnailUrl, visibleRating } from '../archive'
import { matchStatus, STATUS_TABLE } from '../statusConfig'

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'title' | 'status'>): MediaItem {
  return {
    id: partial.title,
    listId: partial.listId ?? 'movies',
    titleKey: partial.title.toLowerCase(),
    statusGroup: 'unknown',
    year: null,
    genres: [],
    why: '',
    updatedAt: null,
    poster: null,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    extra: {},
    ...partial,
  }
}

describe('statusConfig', () => {
  it('matches status text without caring about case or surrounding spaces', () => {
    expect(matchStatus('movies', '  must watch ').value).toBe('Must watch')
    expect(matchStatus('movies', 'MUST WATCH').family).toBe('queue')
    expect(matchStatus('series', '').value).toBe('No status')
    expect(matchStatus('games', 'not a real status').value).toBe('not a real status')
    expect(matchStatus('games', 'not a real status').family).toBe('none')
  })

  it('covers every shelf status from the category tables', () => {
    expect(STATUS_TABLE.movies.map((row) => row.value)).toEqual(['In progress', 'Must watch', 'Want to', 'Maybe', 'Watched', 'Dropped'])
    expect(STATUS_TABLE.series.map((row) => row.value)).toContain('Next season out')
    expect(STATUS_TABLE.anime.find((row) => row.value === 'In progress')?.flavour).toBe('Now streaming')
    expect(STATUS_TABLE.games[0]?.value).toBe('Playing')
    expect(STATUS_TABLE.books.map((row) => row.value)).toEqual(['Reading', 'On hold', 'Want to buy', 'Bought', 'Read'])
  })
})

describe('shelves and current strip', () => {
  it('groups in table order, hides empty groups, and caps a long row', () => {
    const watched = Array.from({ length: 40 }, (_, index) => item({ title: `W${index}`, status: 'Watched', myRating: index }))
    const groups = shelfGroups('movies', [...watched, item({ title: 'Ted 2', status: 'Want to' })])
    expect(groups.map((group) => group.status)).toEqual(['Want to', 'Watched'])
    const seen = groups.find((group) => group.status === 'Watched')
    expect(seen?.items).toHaveLength(30)
    expect(seen?.total).toBe(40)
    expect(seen?.items[0]?.title).toBe('W0')
  })

  it('keeps a blank status in its own group', () => {
    const groups = shelfGroups('movies', [item({ title: 'Untitled', status: '   ' })])
    expect(groups).toEqual([expect.objectContaining({ status: 'No status', total: 1 })])
  })

  it('picks the current status for each category', () => {
    const rows = [
      item({ title: 'Cars', status: 'Watched', listId: 'movies' }),
      item({ title: 'Now', status: 'In progress', listId: 'movies' }),
    ]
    expect(currentItems('movies', rows).map((row) => row.title)).toEqual(['Now'])
    expect(currentItems('games', [item({ title: 'Hades', status: 'Playing', listId: 'games' })])).toHaveLength(1)
    expect(currentItems('books', [item({ title: 'Dune', status: 'Reading', listId: 'books' })])).toHaveLength(1)
  })
})

describe('ratings and rail speed', () => {
  it('hides empty and zero ratings and never calls a score IMDb unless that is the source', () => {
    const hidden = visibleRating({ listId: 'movies', myRating: 0, imdbRating: null })
    expect(hidden.my).toBeNull()
    expect(hidden.external).toBeNull()
    expect(hidden.externalLabel).toBe('IMDb')
    expect(visibleRating({ listId: 'games', myRating: 8, imdbRating: 7.5 }).externalLabel).toBe('Metacritic')
    expect(visibleRating({ listId: 'books', myRating: null, imdbRating: 4 }).externalLabel).toBe('Open Library')
    expect(visibleRating({ listId: 'movies', myRating: 9, imdbRating: 8.8 }).externalLabel).not.toMatch(/tmdb/i)
  })

  it('speeds up toward the rail edge and stays still in the middle', () => {
    expect(edgeScrollSpeed(0, 100)).toBeLessThan(0)
    expect(Math.abs(edgeScrollSpeed(0, 100))).toBeGreaterThan(Math.abs(edgeScrollSpeed(10, 100)))
    expect(edgeScrollSpeed(50, 100)).toBe(0)
    expect(edgeScrollSpeed(100, 100)).toBeGreaterThan(0)
  })

  it('rewrites TMDB poster sizes for display only', () => {
    const url = 'https://image.tmdb.org/t/p/w500/poster.jpg'
    expect(thumbnailUrl(url, 'w342')).toBe('https://image.tmdb.org/t/p/w342/poster.jpg')
    expect(thumbnailUrl(url, 'w185')).toContain('/w185/')
    expect(thumbnailUrl('https://example.com/a.jpg', 'w342')).toBe('https://example.com/a.jpg')
  })
})
