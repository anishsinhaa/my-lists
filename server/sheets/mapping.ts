import { parseUpdatedAt, parseYear } from '../../src/lib/dates.js'
import { normalizeTitle, sanitizePosterUrl, splitGenres } from '../../src/lib/normalize.js'
import { parseRating } from '../../src/lib/rating.js'
import { statusGroupOf, type ListId, type PicksId } from '../../src/types/lists.js'
import type { EnrichField, MediaItem, PickItem, SheetWarning } from '../../src/types/media.js'
import { buildColumnMap, MAIN_ALIASES, PICKS_ALIASES, type MainField, type PicksField } from './headers.js'
import { makeItemId } from './rowKey.js'

export interface MapResult<T> {
  items: T[]
  warnings: SheetWarning[]
  columns: Record<EnrichField, boolean>
}

function cell(row: unknown[], index: number | undefined): unknown {
  return index === undefined ? undefined : row[index]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

function columnsOf(index: { poster?: number; creator?: number; franchise?: number; imdbRating?: number }): Record<EnrichField, boolean> {
  return {
    poster: index.poster !== undefined,
    creator: index.creator !== undefined,
    franchise: index.franchise !== undefined,
    imdbRating: index.imdbRating !== undefined,
  }
}

function emptyColumns(): Record<EnrichField, boolean> {
  return { poster: false, creator: false, franchise: false, imdbRating: false }
}

export function mapMainTab(listId: ListId, values: unknown[][]): MapResult<MediaItem> {
  const warnings: SheetWarning[] = []
  const header = values[0] ?? []
  const map = buildColumnMap<MainField>(header, MAIN_ALIASES)
  if (map.index.title === undefined && (listId === 'other' || listId === 'curious')) {
    const first = map.extras[0]
    if (first !== undefined) {
      map.index.title = first.index
      map.extras.shift()
    }
  }
  if (map.index.title === undefined) {
    warnings.push({ tab: listId, code: 'missing_title_column', message: `${listId} has no Title column` })
    return { items: [], warnings, columns: columnsOf(map.index) }
  }
  const seen = new Map<string, number>()
  const items: MediaItem[] = []
  for (const row of values.slice(1)) {
    const title = text(cell(row, map.index.title))
    if (title.length === 0) continue
    const titleKey = normalizeTitle(title)
    const year = parseYear(cell(row, map.index.year))
    const count = (seen.get(titleKey) ?? 0) + 1
    seen.set(titleKey, count)
    if (count > 1) warnings.push({ tab: listId, code: 'duplicate_title', message: `Duplicate title "${title}"` })
    const extra: Record<string, string> = {}
    for (const column of map.extras) extra[column.header] = text(cell(row, column.index))
    items.push({
      id: makeItemId(listId, titleKey, year, count),
      listId,
      title,
      titleKey,
      status: text(cell(row, map.index.status)),
      statusGroup: statusGroupOf(text(cell(row, map.index.status))),
      year,
      genres: splitGenres(cell(row, map.index.genre)),
      why: text(cell(row, map.index.why)),
      notes: text(cell(row, map.index.notes)),
      updatedAt: parseUpdatedAt(cell(row, map.index.updatedAt)),
      poster: sanitizePosterUrl(cell(row, map.index.poster)),
      creator: text(cell(row, map.index.creator)) || null,
      franchise: text(cell(row, map.index.franchise)) || null,
      myRating: parseRating(cell(row, map.index.myRating)),
      imdbRating: parseRating(cell(row, map.index.imdbRating)),
      platform: text(cell(row, map.index.platform)) || null,
      favourite: text(cell(row, map.index.favourite)).toLowerCase() === 'yes',
      extra,
    })
  }
  return { items, warnings, columns: columnsOf(map.index) }
}

export function mapPicksTab(picksId: PicksId, values: unknown[][]): MapResult<PickItem> {
  const warnings: SheetWarning[] = []
  const map = buildColumnMap<PicksField>(values[0] ?? [], PICKS_ALIASES)
  const columns = emptyColumns()
  columns.poster = map.index.poster !== undefined
  if (map.index.title === undefined) {
    warnings.push({ tab: picksId, code: 'missing_title_column', message: `${picksId} has no Title column` })
    return { items: [], warnings, columns }
  }
  const target = picksId === 'movies-picks' ? 'movies' : picksId === 'series-picks' ? 'series' : 'games'
  const seen = new Map<string, number>()
  const items: PickItem[] = []
  for (const row of values.slice(1)) {
    const title = text(cell(row, map.index.title))
    if (title.length === 0) continue
    const titleKey = normalizeTitle(title)
    const because = text(cell(row, map.index.because))
    const becauseKey = normalizeTitle(because)
    const year = parseYear(cell(row, map.index.year))
    const identity = `${titleKey}:${year ?? ''}:${becauseKey}`
    const count = (seen.get(identity) ?? 0) + 1
    seen.set(identity, count)
    if (count > 1) warnings.push({ tab: picksId, code: 'duplicate_title', message: `Duplicate pick "${title}"` })
    const id = `${picksId}:${titleKey}:${year ?? ''}:${becauseKey}`
    items.push({
      id: count <= 1 ? id : `${id}~${count}`,
      picksId,
      targetList: target,
      title,
      titleKey,
      becauseYouLiked: because,
      becauseKey,
      year,
      genres: splitGenres(cell(row, map.index.genre)),
      status: text(cell(row, map.index.status)),
      why: text(cell(row, map.index.why)),
      poster: sanitizePosterUrl(cell(row, map.index.poster)),
    })
  }
  return { items, warnings, columns }
}
