import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MediaItem } from '@/types/media'
import { DEFAULT_QUERY } from '../filters/listQuery'
import { SeriesSet, seriesBannerReel } from '../SeriesSet'

function item(title: string, status: string, poster: string | null): MediaItem {
  return {
    id: title,
    listId: 'series',
    title,
    titleKey: title.toLowerCase(),
    status,
    statusGroup: 'active',
    year: null,
    genres: [],
    why: '',
    updatedAt: null,
    poster,
    creator: null,
    franchise: null,
    myRating: null,
    imdbRating: null,
    platform: null,
    extra: {},
  }
}

afterEach(() => cleanup())

describe('series banner', () => {
  it('shuffles every poster instead of repeating the shows that are in progress', () => {
    const shows = [
      item('Mentalist', 'In progress', 'mentalist'),
      item('Family Guy', 'In progress', 'guy'),
      item('The Office', 'Watched', 'office'),
      item('Arcane', 'On hold', 'arcane'),
      item('No art', 'Want to', null),
    ]
    const reel = seriesBannerReel(shows, () => 0)
    const half = reel.slice(0, reel.length / 2).map((show) => show.title)
    expect(half).toHaveLength(4)
    expect(new Set(half).size).toBe(4)
    expect(half).toContain('The Office')
    expect(half).toContain('Arcane')
    expect(half).not.toContain('No art')
    expect(reel.slice(reel.length / 2).map((show) => show.title)).toEqual(half)
  })

  it('picks a different order when the shuffle changes', () => {
    const shows = ['One', 'Two', 'Three', 'Four', 'Five'].map((title, index) => item(title, 'Watched', `p${index}`))
    const forward = seriesBannerReel(shows, () => 0.99).slice(0, 5).map((show) => show.title)
    const backward = seriesBannerReel(shows, () => 0).slice(0, 5).map((show) => show.title)
    expect(forward).not.toEqual(backward)
  })

  it('keeps each status button on the bottom of the set, once', () => {
    render(
      <SeriesSet
        items={[item('Mentalist', 'In progress', 'mentalist'), item('Arcane', 'On hold', 'arcane')]}
        query={DEFAULT_QUERY}
        onChange={() => undefined}
      />,
    )
    const group = screen.getByRole('group', { name: 'Status' })
    expect(group.className).toContain('series-dials')
    expect(group.parentElement?.className).toContain('series-cabinet')
    expect(screen.getAllByRole('button', { name: /In progress/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /On hold/ })).toHaveLength(1)
    expect(document.querySelector('.series-side')).toBeNull()
  })
})
