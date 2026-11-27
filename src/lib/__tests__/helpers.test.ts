import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDateAdded, parseSheetDate, parseUpdatedAt, parseYear, serialToIso } from '../dates.ts'
import { normalizeTitle, sanitizePosterUrl, sortTitle, splitGenres } from '../normalize.ts'
import { effectiveRating, externalRatingLabel, parseRating } from '../rating.ts'
import { PICKS_IDS, PICKS_TARGET, STATUSES } from '../../types/lists.ts'
import { PICK_STATUS_OPTIONS } from '../../types/picks.ts'

describe('normalizeTitle', () => {
  it('strips accents and punctuation', () => {
    expect(normalizeTitle('Léon: The Professional')).toBe('leon the professional')
  })

  it('expands ampersands and keeps a leading the', () => {
    expect(normalizeTitle('Tom & Jerry')).toBe('tom and jerry')
    expect(normalizeTitle('The Matrix')).toBe('the matrix')
  })

  it('drops a trailing parenthetical year before matching', () => {
    expect(normalizeTitle('Triangle of Sadness (2022)')).toBe('triangle of sadness')
    expect(normalizeTitle('Les Misérables (2012)')).toBe('les miserables')
    expect(normalizeTitle('The Substance (2024)')).toBe('the substance')
  })

  it('treats hyphens as spaces and roman numerals as digits', () => {
    expect(normalizeTitle('The 40-Year-Old Virgin')).toBe('the 40 year old virgin')
    expect(normalizeTitle('One-Punch Man')).toBe('one punch man')
    expect(normalizeTitle("Baldur's Gate III")).toBe('baldurs gate 3')
  })
})

describe('dates', () => {
  it('converts a Google serial to a calendar date', () => {
    expect(serialToIso(45000)).toBe('2023-03-15')
    expect(parseUpdatedAt(45000)).toBe('2023-03-15T00:00:00.000Z')
  })

  it('parses dd/mm and switches to mm/dd only when the day cannot be first', () => {
    expect(parseUpdatedAt('15/03/2023')).toBe('2023-03-15T00:00:00.000Z')
    expect(parseUpdatedAt('03/15/2023')).toBe('2023-03-15T00:00:00.000Z')
    expect(parseUpdatedAt('03/04/2023')).toBe('2023-04-03T00:00:00.000Z')
    expect(parseUpdatedAt('2026-11-17 23:39')).toBe('2026-11-17T18:09:00.000Z')
    expect(parseDateAdded(45000)).toBe('2023-03-15T00:00:00.000Z')
    expect(parseDateAdded('45000.5')).toBe(parseUpdatedAt(45000.5))
    expect(parseDateAdded('2026-03-12')).toBe(parseUpdatedAt('2026-03-12'))
    expect(parseDateAdded('12/03/2026')).toBe(parseUpdatedAt('12/03/2026'))
    expect(parseDateAdded('2026-11-17 23:39')).toBe('2026-11-17T18:09:00.000Z')
    expect(parseDateAdded('')).toBeNull()
    expect(parseDateAdded('nope')).toBeNull()
    expect(sortTitle('X-Men')).toBe('x men')
    expect(sortTitle('V for Vendetta')).toBe('v for vendetta')
  })

  it('reads a Sheets serial date and leaves real dates and blanks alone', () => {
    expect(parseSheetDate(46138)).toBe('2026-04-26')
    expect(parseSheetDate('46138')).toBe('2026-04-26')
    expect(parseSheetDate('2020-01-02')).toBe('2020-01-02')
    expect(parseSheetDate('')).toBe('')
    expect(parseSheetDate(null)).toBe('')
  })

  it('reads a year from a number or the first 4-digit token', () => {
    expect(parseYear(1999)).toBe(1999)
    expect(parseYear('circa 2010 release')).toBe(2010)
    expect(parseYear(1870)).toBeNull()
  })
})

describe('ratings', () => {
  it('parses ratios, percents, decimals, and rejects junk', () => {
    expect(parseRating('4/5')).toBe(8)
    expect(parseRating('80%')).toBe(8)
    expect(parseRating('abc')).toBeNull()
    expect(parseRating('8,1')).toBe(8.1)
    expect(parseRating('N/A')).toBeNull()
    expect(parseRating(11)).toBeNull()
    expect(parseRating('★★★★')).toBe(8)
  })

  it('prefers my rating and labels the external source', () => {
    expect(effectiveRating({ myRating: null, imdbRating: 7.4 })).toBe(7.4)
    expect(effectiveRating({ myRating: 9, imdbRating: 7.4 })).toBe(9)
    expect(externalRatingLabel('anime')).toBe('IMDb')
  })
})

describe('genres and posters', () => {
  it('splits and title-cases genres', () => {
    expect(splitGenres('Action, sci-fi / Drama')).toEqual(['Action', 'Sci-fi', 'Drama'])
  })

  it('keeps only https poster urls', () => {
    expect(sanitizePosterUrl('http://example.com/a.jpg')).toBeNull()
    expect(sanitizePosterUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })
})

describe('picks vocabulary', () => {
  it('only uses statuses that exist on the target list', () => {
    for (const picksId of PICKS_IDS) {
      const target = PICKS_TARGET[picksId]
      const allowed = target === 'movies' || target === 'series' || target === 'anime' || target === 'games' ? STATUSES[target] : []
      for (const status of PICK_STATUS_OPTIONS[picksId]) {
        expect(allowed).toContain(status)
        expect(status).not.toBe('Skip')
      }
    }
  })
})

describe('module boundaries', () => {
  it('does not import React or the DOM from lib or types', () => {
    const roots = [join(process.cwd(), 'src/lib'), join(process.cwd(), 'src/types')]
    const files = roots.flatMap((root) => walk(root)).filter((file) => file.endsWith('.ts') && !file.includes(`${join('src', 'lib', '__tests__')}`))
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/from\s+['"]react/)
      expect(source, file).not.toMatch(/from\s+['"]react-dom/)
    }
  })
})

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}
