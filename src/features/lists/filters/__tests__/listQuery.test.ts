import { describe, expect, it } from 'vitest'
import { parseListQuery, serializeListQuery, DEFAULT_QUERY } from '../listQuery'

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

  it('defaults to title A–Z and drops an Updated at sort', () => {
    expect(parseListQuery(new URLSearchParams()).sort).toBe('title')
    expect(parseListQuery(new URLSearchParams()).dir).toBe('asc')
    expect(parseListQuery(new URLSearchParams('sort=updated&dir=desc')).sort).toBe('title')
    expect(parseListQuery(new URLSearchParams('sort=finished&dir=desc')).sort).toBe('finished')
  })
})
