import { describe, expect, it } from 'vitest'
import type { SheetsClient } from '../../sheets/client.js'
import { PickStatusError, updatePickStatus } from '../updatePickStatus.js'

function client(rows: unknown[][]): SheetsClient & { rows: unknown[][]; calls: number } {
  const data = { rows, calls: 0 }
  return {
    ...data,
    async batchGetValues() {
      data.calls += 1
      return [{ range: "'Movies picks'!A1:Z3000", values: rows }]
    },
    async batchUpdateValues(updates) {
      data.calls += 1
      for (const update of updates) {
        const cell = /!([A-Z]+)(\d+)$/.exec(update.range)
        if (cell === null) continue
        rows[Number(cell[2]) - 1]![3] = update.value
      }
    },
  }
}

const header = ['Title', 'Because you liked', 'Year', 'Status']

describe('updatePickStatus', () => {
  it('writes an allowed status and preserves a conflicting cell', async () => {
    const sheet = client([header, ['Dune', 'Arrival', 2021, '']])
    expect((await updatePickStatus(sheet, { picksId: 'movies-picks', title: 'Dune', year: 2021, because: 'Arrival', status: 'Must watch', expectedCurrent: '' })).outcome).toBe('written')
    expect(sheet.rows[1]?.[3]).toBe('Must watch')
    sheet.rows[1]![3] = 'Watched'
    const conflict = await updatePickStatus(sheet, { picksId: 'movies-picks', title: 'Dune', year: 2021, because: 'Arrival', status: 'Want to', expectedCurrent: 'Must watch' })
    expect(conflict.outcome).toBe('conflict')
    expect(sheet.rows[1]?.[3]).toBe('Watched')
  })

  it('rejects Skip and statuses from the wrong tab', async () => {
    const sheet = client([header, ['Dune', 'Arrival', 2021, '']])
    await expect(updatePickStatus(sheet, { picksId: 'movies-picks', title: 'Dune', year: 2021, because: 'Arrival', status: 'Skip', expectedCurrent: '' })).rejects.toBeInstanceOf(PickStatusError)
    await expect(updatePickStatus(sheet, { picksId: 'games-picks', title: 'Dune', year: 2021, because: 'Arrival', status: 'Watched', expectedCurrent: '' })).rejects.toBeInstanceOf(PickStatusError)
    expect(sheet.rows[1]?.[3]).toBe('')
  })
})
