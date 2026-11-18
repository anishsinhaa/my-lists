import { describe, expect, it } from 'vitest'
import { CLEARED_FILTERS, hasActiveFilters, parseListQuery, serializeListQuery, DEFAULT_QUERY } from '../listQuery'

describe('list query shelves and posters', () => {
  it('round-trips shelves and a poster filter and ignores unknown keys', () => {
    const parsed = parseListQuery(new URLSearchParams('view=shelves&poster=missing&nope=1'))
    expect(parsed.view).toBe('shelves')
    expect(parsed.poster).toBe('missing')
    const again = parseListQuery(serializeListQuery({ ...DEFAULT_QUERY, view: 'shelves', poster: 'has' }))
    expect(again.view).toBe('shelves')
    expect(again.poster).toBe('has')
  })

  it('keeps a shelf grouped by status until a group is chosen', () => {
    expect(parseListQuery(new URLSearchParams('view=shelves')).group).toBe('status')
    expect(parseListQuery(new URLSearchParams()).group).toBe('none')
    expect(parseListQuery(new URLSearchParams('group=genre')).group).toBe('genre')
    expect(serializeListQuery({ ...DEFAULT_QUERY, view: 'shelves', group: 'status' }).get('group')).toBeNull()
    expect(serializeListQuery({ ...DEFAULT_QUERY, group: 'year' }).get('group')).toBe('year')
    expect(parseListQuery(new URLSearchParams('group=nope')).group).toBe('none')
  })

  it('drops filter params when the filters are cleared and keeps the view', () => {
    const dirty = { ...DEFAULT_QUERY, view: 'shelves' as const, statuses: ['Watched'], genres: ['Drama'], yearMin: 1990, yearMax: 2000, q: 'heat', creator: 'Nolan', franchise: 'Batman', platform: 'PC', ratingMin: 8, ratingBy: 'my' as const, smart: 'nolan', poster: 'missing' as const }
    expect(hasActiveFilters(dirty)).toBe(true)
    expect(hasActiveFilters(DEFAULT_QUERY)).toBe(false)
    const params = serializeListQuery({ ...dirty, ...CLEARED_FILTERS })
    expect(params.get('status')).toBeNull()
    expect(params.get('genre')).toBeNull()
    expect(params.get('ymin')).toBeNull()
    expect(params.get('ymax')).toBeNull()
    expect(params.get('q')).toBeNull()
    expect(params.get('creator')).toBeNull()
    expect(params.get('franchise')).toBeNull()
    expect(params.get('platform')).toBeNull()
    expect(params.get('rmin')).toBeNull()
    expect(params.get('rby')).toBeNull()
    expect(params.get('smart')).toBeNull()
    expect(params.get('poster')).toBeNull()
    expect(params.get('view')).toBe('shelves')
  })

  it('defaults to title A–Z and drops an Updated at sort', () => {
    expect(parseListQuery(new URLSearchParams()).sort).toBe('title')
    expect(parseListQuery(new URLSearchParams()).dir).toBe('asc')
    expect(parseListQuery(new URLSearchParams('sort=updated&dir=desc')).sort).toBe('title')
    expect(parseListQuery(new URLSearchParams('sort=finished&dir=desc')).sort).toBe('finished')
  })
})
