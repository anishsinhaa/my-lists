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
})
