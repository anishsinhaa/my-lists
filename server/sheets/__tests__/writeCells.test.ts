import { describe, expect, it } from 'vitest'
import type { SheetsClient } from '../client.js'
import { assertWritable, WRITE_POLICY, WriteForbiddenError } from '../writeGuard.js'
import { writeCells, type CellWrite } from '../writeCells.js'

function memory(rows: unknown[][]): SheetsClient & { rows: unknown[][] } {
  const data = rows.map((row) => [...row])
  return {
    rows: data,
    async batchGetValues() {
      return [{ range: "'Movies'!A1:Z3000", values: data }]
    },
    async batchUpdateValues(updates) {
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null) continue
        const column = cell[1] === 'C' ? 2 : cell[1] === 'G' ? 6 : 0
        const row = Number(cell[2]) - 1
        const line = data[row] ?? []
        line[column] = update.value
        data[row] = line
      }
    },
  }
}

const header = ['Title', 'Year', 'Poster', 'Director/Creator', 'Franchise', 'My Rating', 'IMDb Rating']

function poster(titleKey: string, year: number | null): CellWrite {
  return { tab: 'movies', field: 'poster', titleKey, year, value: 'https://img.example/p.jpg', expectedCurrent: '' }
}

describe('writeCells', () => {
  it('writes the row that matches the title after the sheet is reordered', async () => {
    const client = memory([header, ['Heat', 1995, '', '', '', 9, ''], ['Inception', 2010, '', '', '', '', '']])
    client.rows.reverse()
    client.rows.unshift(client.rows.pop() ?? [])
    const [result] = await writeCells(client, [poster('inception', 2010)])
    expect(result?.outcome).toBe('written')
    const inception = client.rows.find((row) => row[0] === 'Inception')
    expect(inception?.[2]).toBe('https://img.example/p.jpg')
    expect(client.rows.find((row) => row[0] === 'Heat')?.[2]).toBe('')
  })

  it('does not overwrite a filled cell and refuses My Rating', async () => {
    const client = memory([header, ['Heat', 1995, 'https://img.example/old.jpg', '', '', 9, '']])
    const [result] = await writeCells(client, [{ ...poster('heat', 1995), expectedCurrent: '' }])
    expect(result?.outcome).toBe('skipped_conflict')
    expect(client.rows[1]?.[2]).toBe('https://img.example/old.jpg')
    expect(() => assertWritable('movies', 'myRating' as 'poster')).toThrow(WriteForbiddenError)
  })

  it('overwrites a poster when the refresh asks to replace the current value', async () => {
    const client = memory([header, ['Heat', 1995, 'https://img.example/old.jpg', '', '', 9, '8.8']])
    const [result] = await writeCells(client, [{ ...poster('heat', 1995), value: 'https://img.example/new.jpg', expectedCurrent: 'https://img.example/old.jpg', overwrite: true }])
    expect(result?.outcome).toBe('written')
    expect(client.rows[1]?.[2]).toBe('https://img.example/new.jpg')
    expect(client.rows[1]?.[5]).toBe(9)
    expect(client.rows[1]?.[6]).toBe('8.8')
  })

  it('never lets a fill write description, notes, or genre', () => {
    const banned = ['description', 'why', 'notes', 'note', 'genre', 'genres']
    for (const fields of Object.values(WRITE_POLICY)) {
      expect(fields.some((field) => banned.includes(field))).toBe(false)
    }
  })

  it('skips ambiguous duplicates and a missing column', async () => {
    const dupes = memory([header, ['Heat', '', '', '', '', '', ''], ['Heat', '', '', '', '', '', '']])
    expect((await writeCells(dupes, [{ ...poster('heat', null) }]))[0]?.outcome).toBe('skipped_ambiguous')
    const missing = memory([['Title'], ['Heat']])
    expect((await writeCells(missing, [poster('heat', null)]))[0]?.outcome).toBe('skipped_missing_column')
  })
})
