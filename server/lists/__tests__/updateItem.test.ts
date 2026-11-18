import { describe, expect, it } from 'vitest'
import type { SheetsClient } from '../../sheets/client.js'
import { updateListItem } from '../updateItem.js'

function columnIndex(letters: string): number {
  return [...letters].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function client(rows: unknown[][]): SheetsClient & { rows: unknown[][] } {
  const data = rows.map((row) => [...row])
  return {
    rows: data,
    async batchGetValues() {
      return [{ range: "'Movies'!A1:Z3000", values: data.map((row) => [...row]) }]
    },
    async batchUpdateValues(updates) {
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null || cell[1] === undefined || cell[2] === undefined) continue
        const row = data[Number(cell[2]) - 1] ?? []
        row[columnIndex(cell[1])] = update.value
        data[Number(cell[2]) - 1] = row
      }
    },
  }
}

const header = ['Title', 'Year', 'Status', 'My Rating', 'Updated at', 'Description', 'Date finished', 'Poster', 'IMDb Rating', 'Genre', 'Notes']
const now = new Date('2026-11-17T12:00:00.000Z')

describe('updateListItem', () => {
  it('writes status, rating, and an IST timestamp, and sets date finished when a title is newly watched', async () => {
    const sheet = client([header, ['Heat', 1995, 'Want to', '', '', 'a heist', '', 'https://img.example/old.jpg', '', 'Crime', 'old note']])
    const result = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 9, why: 'still a heist' }, now)
    expect(result.outcome).toBe('written')
    expect(result.updatedAt).toBe('2026-11-17 17:30')
    expect(result.finishedOn).toBe('2026-11-17')
    expect(sheet.rows[1]?.[2]).toBe('Watched')
    expect(sheet.rows[1]?.[3]).toBe(9)
    expect(sheet.rows[1]?.[4]).toBe('2026-11-17 17:30')
    expect(sheet.rows[1]?.[5]).toBe('a heist')
    expect(sheet.rows[1]?.[6]).toBe('2026-11-17')
    expect(sheet.rows[1]?.[7]).toBe('https://img.example/old.jpg')
    expect(sheet.rows[1]?.[8]).toBe('')
    expect(sheet.rows[1]?.[9]).toBe('Crime')
    expect(sheet.rows[1]?.[10]).toBe('still a heist')
  })

  it('clears a rating without touching a date that is already set', async () => {
    const sheet = client([header, ['Heat', 1995, 'Watched', 9, '2020-01-01 10:00', '', '2019-05-01', '', '']])
    const result = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: null }, now)
    expect(result.outcome).toBe('written')
    expect(result.finishedOn).toBe('2019-05-01')
    expect(sheet.rows[1]?.[3]).toBe('')
    expect(sheet.rows[1]?.[6]).toBe('2019-05-01')
  })

  it('does not set date finished for a queue status, and rejects a rating outside 1–10', async () => {
    const sheet = client([header, ['Heat', 1995, 'Want to', '', '', '', '', '', '']])
    const queued = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Want to', myRating: 4 }, now)
    expect(queued.finishedOn).toBeNull()
    expect(sheet.rows[1]?.[6]).toBe('')
    const invalid = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 11 }, now)
    expect(invalid.outcome).toBe('invalid')
    expect(sheet.rows[1]?.[2]).toBe('Want to')
    const half = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Want to', myRating: 7.5 }, now)
    expect(half.outcome).toBe('written')
    expect(sheet.rows[1]?.[3]).toBe(7.5)
    const step = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Want to', myRating: 7.2 }, now)
    expect(step.outcome).toBe('invalid')
    expect(sheet.rows[1]?.[3]).toBe(7.5)
  })

  it('strips control characters from a note and rejects one longer than 2000 characters', async () => {
    const sheet = client([header, ['Heat', 1995, 'Want to', '', '', '', '', '', '']])
    const written = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Want to', myRating: null, why: 'a\u0000line\nkeep\tthis' }, now)
    expect(written.outcome).toBe('written')
    expect(sheet.rows[1]?.[5]).toBe('')
    expect(sheet.rows[1]?.[10]).toBe('aline\nkeep\tthis')
    const huge = await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Want to', myRating: null, why: 'x'.repeat(2001) }, now)
    expect(huge.outcome).toBe('invalid')
    expect(sheet.rows[1]?.[5]).toBe('')
    expect(sheet.rows[1]?.[10]).toBe('aline\nkeep\tthis')
  })

  it('reports a missing row and an ambiguous title', async () => {
    const sheet = client([header, ['Heat', 1995, 'Want to', '', '', '', '', '', ''], ['Heat', 1995, 'Want to', '', '', '', '', '', '']])
    expect((await updateListItem(sheet, { listId: 'movies', id: 'movies:missing:1995', title: 'Missing', year: 1995, status: 'Watched', myRating: 8 }, now)).outcome).toBe('not_found')
    expect((await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995', title: 'Heat', year: 1995, status: 'Watched', myRating: 8 }, now)).outcome).toBe('ambiguous')
    expect((await updateListItem(sheet, { listId: 'movies', id: 'movies:heat:1995~2', title: 'Heat', year: 1995, status: 'Played', myRating: 8 }, now)).outcome).toBe('invalid')
    expect(sheet.rows[2]?.[2]).toBe('Want to')
  })
})
