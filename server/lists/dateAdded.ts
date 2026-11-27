import { formatIstStamp } from '../../src/lib/dates.js'
import type { ColumnMap, MainField } from '../sheets/headers.js'

// The future create path must call withDateAdded for a new row.
// No update path, including updateListItem, may write the Date added column.

export function dateAddedCell(now: Date): string {
  return formatIstStamp(now)
}

export function withDateAdded(rowValues: (string | number)[], map: ColumnMap<MainField>, now: Date): (string | number)[] {
  const index = map.index.dateAdded
  if (index === undefined) return rowValues
  const current = index < rowValues.length ? rowValues[index] : ''
  if (current !== undefined && String(current).trim().length > 0) return rowValues
  const next = rowValues.slice()
  while (next.length <= index) next.push('')
  next[index] = dateAddedCell(now)
  return next
}
