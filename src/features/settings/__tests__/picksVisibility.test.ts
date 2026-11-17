import { describe, expect, it } from 'vitest'
import { visiblePicks } from '../picksVisibility'

describe('picks toggles', () => {
  it('hides a picks tab that is off and hides every picks tab when the master toggle is off', () => {
    expect(visiblePicks({ movies: true, series: false, games: true })).toEqual(['movies-picks', 'games-picks'])
    expect(visiblePicks({ movies: true, series: true, games: false })).not.toContain('games-picks')
    expect(visiblePicks({ movies: false, series: false, games: false })).toEqual([])
  })
})
