import { describe, expect, it } from 'vitest'
import { buildColumnMap, columnLetter, MAIN_ALIASES } from '../headers.js'

describe('headers', () => {
  it('maps headers in any order and keeps unknown columns as extras', () => {
    const map = buildColumnMap(['Genre', 'My Rating', 'Title', 'Notes', 'IMDb Rating', 'Director/Creator'], MAIN_ALIASES)
    expect(map.index.title).toBe(2)
    expect(map.index.genre).toBe(0)
    expect(map.index.myRating).toBe(1)
    expect(map.index.imdbRating).toBe(4)
    expect(map.index.creator).toBe(5)
    expect(map.extras).toEqual([])
    const unknown = buildColumnMap(['Title', 'Box office'], MAIN_ALIASES)
    expect(unknown.extras).toEqual([{ header: 'box office', index: 1 }])
  })

  it('does not treat IMDb Rating as My Rating, and still accepts a legacy Rating header', () => {
    const legacy = buildColumnMap(['Title', 'Rating'], MAIN_ALIASES)
    expect(legacy.index.myRating).toBe(1)
    expect(legacy.index.imdbRating).toBeUndefined()
    const both = buildColumnMap(['Rating', 'IMDb Rating'], MAIN_ALIASES)
    expect(both.index.myRating).toBe(0)
    expect(both.index.imdbRating).toBe(1)
  })

  it('maps a legacy Director header to creator', () => {
    expect(buildColumnMap(['Director'], MAIN_ALIASES).index.creator).toBe(0)
  })

  it('converts column indexes to letters', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
  })
})
