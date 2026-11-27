import { describe, expect, it } from 'vitest'
import { buildColumnMap, MAIN_ALIASES } from '../../sheets/headers.js'
import { dateAddedCell, withDateAdded } from '../dateAdded.js'

describe('date added helpers', () => {
  it('stamps an empty cell and never overwrites one that is already set', () => {
    const map = buildColumnMap(['Title', 'Date added'], MAIN_ALIASES)
    const now = new Date('2026-03-12T04:30:00.000Z')
    expect(dateAddedCell(now)).toBe('2026-03-12 10:00')
    expect(withDateAdded(['Heat', ''], map, now)).toEqual(['Heat', '2026-03-12 10:00'])
    expect(withDateAdded(['Heat', '2020-01-01 01:00'], map, now)).toEqual(['Heat', '2020-01-01 01:00'])
    expect(withDateAdded(['Heat'], buildColumnMap(['Title'], MAIN_ALIASES), now)).toEqual(['Heat'])
  })
})
