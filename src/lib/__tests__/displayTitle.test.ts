import { describe, expect, it } from 'vitest'
import { displayTitle } from '../displayTitle'

describe('displayTitle', () => {
  it('drops a trailing year that repeats the year field', () => {
    expect(displayTitle('The Raid (2012)', 2012)).toBe('The Raid')
    expect(displayTitle('Aftersun (2022)', 2022)).toBe('Aftersun')
    expect(displayTitle('Dune: Part Two (2024)', 2024)).toBe('Dune: Part Two')
    expect(displayTitle('Heat [1995]', 1995)).toBe('Heat')
  })

  it('keeps the title when the year is not already shown beside it', () => {
    expect(displayTitle('The Raid (2012)', null)).toBe('The Raid (2012)')
    expect(displayTitle('The Raid (2012)', 2011)).toBe('The Raid (2012)')
    expect(displayTitle('2012', 2012)).toBe('2012')
  })
})
