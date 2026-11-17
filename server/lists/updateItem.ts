import { formatIstDay, formatIstStamp, parseYear } from '../../src/lib/dates.js'
import { normalizeTitle } from '../../src/lib/normalize.js'
import { LIST_IDS, TAB_NAME, type ListId } from '../../src/types/lists.js'
import type { SheetsClient } from '../sheets/client.js'
import { buildColumnMap, columnLetter, MAIN_ALIASES, type MainField } from '../sheets/headers.js'

const DONE = new Set(['watched', 'played', 'completed', 'read'])

const ALLOWED: Record<ListId, readonly string[]> = {
  movies: ['In progress', 'Must watch', 'Want to', 'Maybe', 'Watched', 'Dropped'],
  series: ['In progress', 'Next season out', 'Waiting for next season', 'Rewatch from start', 'Paused', 'On hold', 'Want to', 'Maybe later', 'Watched', 'Dropped'],
  anime: ['In progress', 'Next season out', 'Waiting for next season', 'Rewatch from start', 'Paused', 'On hold', 'Want to', 'Maybe later', 'Watched', 'Dropped'],
  games: ['Playing', 'Replay from start', 'Paused', 'On hold', 'Want to', 'Played', 'Completed', 'Dropped'],
  books: ['Reading', 'On hold', 'Want to buy', 'Bought', 'Read'],
  other: [],
  curious: [],
}

export interface ItemUpdate {
  listId: ListId
  id: string
  title: string
  year: number | null
  status: string
  myRating: number | null
  why?: string
}

export interface ItemUpdateResult {
  outcome: 'written' | 'not_found' | 'ambiguous' | 'invalid'
  updatedAt?: string
  finishedOn?: string | null
  detail?: string
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim()
}

function duplicateIndex(id: string): number | null {
  const match = /~(\d+)$/.exec(id)
  return match === null ? null : Number(match[1])
}

export async function updateListItem(client: SheetsClient, input: ItemUpdate, now = new Date()): Promise<ItemUpdateResult> {
  if (!(LIST_IDS as readonly string[]).includes(input.listId)) return { outcome: 'invalid' }
  if (input.myRating !== null && (!Number.isInteger(input.myRating) || input.myRating < 1 || input.myRating > 10)) return { outcome: 'invalid' }
  const [batch] = await client.batchGetValues([`'${TAB_NAME[input.listId]}'!A1:Z3000`])
  const values = batch?.values ?? []
  const map = buildColumnMap<MainField>(values[0] ?? [], MAIN_ALIASES)
  const titleIndex = map.index.title
  const statusIndex = map.index.status
  const ratingIndex = map.index.myRating
  const updatedIndex = map.index.updatedAt
  if (titleIndex === undefined || statusIndex === undefined || ratingIndex === undefined || updatedIndex === undefined) return { outcome: 'invalid', detail: 'missing_column' }
  const finishedColumn = map.extras.find((column) => column.header === 'date finished')
  const matches: number[] = []
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index] ?? []
    if (normalizeTitle(text(row[titleIndex])) !== normalizeTitle(input.title)) continue
    if (input.year !== null && parseYear(row[map.index.year ?? -1]) !== input.year) continue
    matches.push(index)
  }
  const nth = duplicateIndex(input.id)
  if (matches.length === 0) return { outcome: 'not_found' }
  if (matches.length > 1 && nth === null) return { outcome: 'ambiguous' }
  const rowIndex = matches[(nth ?? 1) - 1]
  if (rowIndex === undefined) return { outcome: 'not_found' }
  const row = values[rowIndex] ?? []
  const currentStatus = text(row[statusIndex])
  const known = ALLOWED[input.listId].find((entry) => entry.toLowerCase() === input.status.trim().toLowerCase())
  const nextStatus = known ?? (input.status.trim().toLowerCase() === currentStatus.toLowerCase() ? currentStatus : null)
  if (nextStatus === null) return { outcome: 'invalid' }
  const stamp = formatIstStamp(now)
  const today = formatIstDay(now)
  const finishedCurrent = finishedColumn === undefined ? '' : text(row[finishedColumn.index])
  const becameDone = !DONE.has(currentStatus.toLowerCase()) && DONE.has(nextStatus.toLowerCase())
  const setFinished = becameDone && finishedCurrent.length === 0 && finishedColumn !== undefined
  const updates: Array<{ range: string; value: string | number; prior: string | number }> = [
    { range: `'${TAB_NAME[input.listId]}'!${columnLetter(statusIndex)}${rowIndex + 1}`, value: nextStatus, prior: row[statusIndex] === undefined ? '' : row[statusIndex] as string | number },
    { range: `'${TAB_NAME[input.listId]}'!${columnLetter(ratingIndex)}${rowIndex + 1}`, value: input.myRating ?? '', prior: row[ratingIndex] === undefined ? '' : row[ratingIndex] as string | number },
    { range: `'${TAB_NAME[input.listId]}'!${columnLetter(updatedIndex)}${rowIndex + 1}`, value: stamp, prior: row[updatedIndex] === undefined ? '' : row[updatedIndex] as string | number },
  ]
  if (input.why !== undefined && map.index.why !== undefined) {
    updates.push({ range: `'${TAB_NAME[input.listId]}'!${columnLetter(map.index.why)}${rowIndex + 1}`, value: input.why, prior: row[map.index.why] === undefined ? '' : row[map.index.why] as string | number })
  }
  if (setFinished && finishedColumn !== undefined) {
    updates.push({ range: `'${TAB_NAME[input.listId]}'!${columnLetter(finishedColumn.index)}${rowIndex + 1}`, value: today, prior: row[finishedColumn.index] === undefined ? '' : row[finishedColumn.index] as string | number })
  }
  await client.batchUpdateValues(updates.map((update) => ({ range: update.range, value: update.value })))
  const [verified] = await client.batchGetValues([`'${TAB_NAME[input.listId]}'!A1:Z3000`])
  const after = verified?.values ?? []
  const afterRow = after[rowIndex] ?? []
  const afterMap = buildColumnMap<MainField>(after[0] ?? [], MAIN_ALIASES)
  if (normalizeTitle(text(afterRow[afterMap.index.title ?? -1])) !== normalizeTitle(input.title)) {
    await client.batchUpdateValues(updates.map((update) => ({ range: update.range, value: update.prior })))
    return { outcome: 'invalid', detail: 'row_moved' }
  }
  return { outcome: 'written', updatedAt: stamp, finishedOn: setFinished ? today : finishedCurrent.length > 0 ? finishedCurrent : null }
}
