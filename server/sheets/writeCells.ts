import { parseYear } from '../../src/lib/dates.js'
import { normalizeTitle } from '../../src/lib/normalize.js'
import { PICKS_IDS, TAB_NAME, type TabId } from '../../src/types/lists.js'
import type { SheetsClient } from './client.js'
import { buildColumnMap, columnLetter, MAIN_ALIASES, PICKS_ALIASES, type MainField, type PicksField } from './headers.js'
import { assertFillOnly, assertWritable, type WritableField } from './writeGuard.js'

export interface CellWrite {
  tab: TabId
  field: WritableField
  titleKey: string
  year: number | null
  becauseKey?: string
  value: string | number
  expectedCurrent: string
  overwrite?: boolean
}

export type WriteOutcome = 'written' | 'skipped_not_found' | 'skipped_ambiguous' | 'skipped_conflict' | 'skipped_missing_column' | 'skipped_policy' | 'error'
export interface WriteResult { write: CellWrite; outcome: WriteOutcome; currentValue?: string; detail?: string }

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

function columnField(field: WritableField): string {
  return field === 'pickStatus' ? 'status' : field
}

interface Found { row: number; current: string; column: number }

function findRow(values: unknown[][], write: CellWrite): { found: Found } | { outcome: WriteOutcome; currentValue?: string } {
  const picks = (PICKS_IDS as readonly string[]).includes(write.tab)
  const map = picks ? buildColumnMap<PicksField>(values[0] ?? [], PICKS_ALIASES) : buildColumnMap<MainField>(values[0] ?? [], MAIN_ALIASES)
  const columns = map.index as Partial<Record<string, number>>
  const titleIndex = columns.title
  const fieldIndex = columns[columnField(write.field)]
  if (titleIndex === undefined || fieldIndex === undefined) return { outcome: 'skipped_missing_column' }
  const matches: number[] = []
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] ?? []
    if (normalizeTitle(text(row[titleIndex])) !== write.titleKey) continue
    if (write.year !== null && parseYear(row[columns.year ?? -1]) !== write.year) continue
    if (write.becauseKey !== undefined && normalizeTitle(text(row[columns.because ?? -1])) !== write.becauseKey) continue
    matches.push(rowIndex)
  }
  if (matches.length === 0) return { outcome: 'skipped_not_found' }
  if (matches.length > 1) return { outcome: 'skipped_ambiguous' }
  const rowIndex = matches[0] ?? 0
  const row = values[rowIndex] ?? []
  return { found: { row: rowIndex + 1, current: text(row[fieldIndex]), column: fieldIndex } }
}

export async function writeCells(client: SheetsClient, writes: CellWrite[]): Promise<WriteResult[]> {
  for (const write of writes) {
    assertWritable(write.tab, write.field)
    assertFillOnly(write.field, write.expectedCurrent, write.overwrite === true)
  }
  const tabs = [...new Set(writes.map((write) => write.tab))]
  const ranges = tabs.map((tab) => `'${TAB_NAME[tab]}'!A1:Z3000`)
  const batches = await client.batchGetValues(ranges)
  const byTab = new Map<TabId, unknown[][]>()
  tabs.forEach((tab, index) => byTab.set(tab, batches[index]?.values ?? []))
  const pending: Array<{ write: CellWrite; found: Found }> = []
  const results: WriteResult[] = []
  for (const write of writes) {
    const located = findRow(byTab.get(write.tab) ?? [], write)
    if ('outcome' in located) {
      results.push({ write, outcome: located.outcome, currentValue: located.currentValue })
      continue
    }
    if (located.found.current !== write.expectedCurrent) {
      results.push({ write, outcome: 'skipped_conflict', currentValue: located.found.current })
      continue
    }
    pending.push({ write, found: located.found })
  }
  if (pending.length > 0) {
    await client.batchUpdateValues(pending.map(({ write, found }) => ({
      range: `'${TAB_NAME[write.tab]}'!${columnLetter(found.column)}${found.row}`,
      value: write.value,
    })))
  }
  const verified = pending.length === 0 ? [] : await client.batchGetValues(ranges)
  const verifiedByTab = new Map<TabId, unknown[][]>()
  tabs.forEach((tab, index) => verifiedByTab.set(tab, verified[index]?.values ?? []))
  for (const entry of pending) {
    const values = verifiedByTab.get(entry.write.tab) ?? []
    const map = (PICKS_IDS as readonly string[]).includes(entry.write.tab) ? buildColumnMap(values[0] ?? [], PICKS_ALIASES) : buildColumnMap(values[0] ?? [], MAIN_ALIASES)
    const row = values[entry.found.row - 1] ?? []
    const titleNow = normalizeTitle(text(row[map.index.title ?? -1]))
    if (titleNow !== entry.write.titleKey) {
      const current = text(row[entry.found.column])
      if (current === String(entry.write.value)) {
        await client.batchUpdateValues([{ range: `'${TAB_NAME[entry.write.tab]}'!${columnLetter(entry.found.column)}${entry.found.row}`, value: entry.write.expectedCurrent }])
      }
      results.push({ write: entry.write, outcome: 'error', detail: 'row_moved' })
      continue
    }
    results.push({ write: entry.write, outcome: 'written' })
  }
  return results
}
