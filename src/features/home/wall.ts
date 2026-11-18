import { matchStatus } from '@/design/statusConfig'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'

export const MY_RATING_MIN = 0.1
const FINISHED = ['Watched', 'Played', 'Completed', 'Read']

export interface WallFilter {
  statuses?: string[]
  sort?: string
  dir?: 'asc' | 'desc'
  ratingMin?: number
}

export interface WallTile {
  id: string
  title: string
  href: string
  filter: WallFilter
  items: MediaItem[]
}

function statusIs(items: MediaItem[], listId: ListId, values: string[]): MediaItem[] {
  const wanted = new Set(values.map((value) => value.toLowerCase()))
  return items.filter((item) => wanted.has(matchStatus(listId, item.status).value.toLowerCase()))
}

function finishedOn(item: MediaItem): string {
  return (item.extra['date finished'] ?? '').trim()
}

function byFinished(items: MediaItem[]): MediaItem[] {
  return [...items].sort((left, right) => {
    const a = finishedOn(left)
    const b = finishedOn(right)
    if (a.length === 0 && b.length === 0) return left.titleKey.localeCompare(right.titleKey)
    if (a.length === 0) return 1
    if (b.length === 0) return -1
    return b.localeCompare(a) || left.titleKey.localeCompare(right.titleKey)
  })
}

function byMyRating(items: MediaItem[]): MediaItem[] {
  return items
    .filter((item) => item.myRating !== null && item.myRating >= MY_RATING_MIN)
    .sort((left, right) => (right.myRating ?? 0) - (left.myRating ?? 0) || left.titleKey.localeCompare(right.titleKey))
}

function soleList(items: MediaItem[]): ListId | null {
  const ids = new Set(items.map((item) => item.listId))
  if (ids.size !== 1) return null
  return [...ids][0] ?? null
}

function filterParams(filter: WallFilter, itemId?: string): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.statuses !== undefined && filter.statuses.length > 0) params.set('status', filter.statuses.join(','))
  if (filter.sort !== undefined) params.set('sort', filter.sort)
  if (filter.dir !== undefined) params.set('dir', filter.dir)
  if (filter.ratingMin !== undefined) {
    params.set('rmin', String(filter.ratingMin))
    params.set('rby', 'my')
  }
  if (itemId !== undefined) params.set('item', itemId)
  return params
}

function categoryHref(listId: ListId, filter: WallFilter): string {
  const query = filterParams(filter).toString()
  return query.length === 0 ? `/lists/${listId}` : `/lists/${listId}?${query}`
}

export function posterHref(item: MediaItem, filter: WallFilter): string {
  return `/lists/${item.listId}?${filterParams(filter, item.id).toString()}`
}

function tileHref(id: string, items: MediaItem[], filter: WallFilter): string {
  const listId = soleList(items)
  if (listId === null) return `/shelf/${id}`
  return categoryHref(listId, filter)
}

export function wallTiles(payload: ListsPayload): WallTile[] {
  const lists = payload.lists
  const watching = [...statusIs(lists.movies, 'movies', ['In progress']), ...statusIs(lists.series, 'series', ['In progress']), ...statusIs(lists.anime, 'anime', ['In progress'])]
  const playing = statusIs(lists.games, 'games', ['Playing', 'In progress'])
  const reading = statusIs(lists.books, 'books', ['Reading', 'In progress'])
  const nextSeason = [...statusIs(lists.series, 'series', ['Next season out']), ...statusIs(lists.anime, 'anime', ['Next season out'])]
  const parked = LIST_IDS.flatMap((id) => statusIs(lists[id], id, ['Paused', 'On hold']))
  const finished = byFinished(LIST_IDS.flatMap((id) => statusIs(lists[id], id, FINISHED)))
  const rated = byMyRating(LIST_IDS.flatMap((id) => lists[id]))
  const watchingFilter: WallFilter = { statuses: ['In progress'] }
  const playingFilter: WallFilter = { statuses: ['Playing', 'In progress'] }
  const readingFilter: WallFilter = { statuses: ['Reading', 'In progress'] }
  const nextFilter: WallFilter = { statuses: ['Next season out'] }
  const pausedFilter: WallFilter = { statuses: ['Paused', 'On hold'] }
  const finishedFilter: WallFilter = { statuses: FINISHED, sort: 'finished', dir: 'desc' }
  const ratedFilter: WallFilter = { sort: 'myRating', dir: 'desc', ratingMin: MY_RATING_MIN }
  const tiles: WallTile[] = [
    { id: 'watching', title: 'Now watching', href: tileHref('watching', watching, watchingFilter), filter: watchingFilter, items: watching },
    { id: 'playing', title: 'Now playing', href: tileHref('playing', playing, playingFilter), filter: playingFilter, items: playing },
    { id: 'reading', title: 'Now reading', href: tileHref('reading', reading, readingFilter), filter: readingFilter, items: reading },
    { id: 'next', title: 'Next season out', href: tileHref('next', nextSeason, nextFilter), filter: nextFilter, items: nextSeason },
    { id: 'paused', title: 'Paused / On hold', href: tileHref('paused', parked, pausedFilter), filter: pausedFilter, items: parked },
    { id: 'finished', title: 'Recently finished', href: tileHref('finished', finished, finishedFilter), filter: finishedFilter, items: finished },
    { id: 'rated', title: 'Top rated', href: tileHref('rated', rated, ratedFilter), filter: ratedFilter, items: rated },
  ]
  return tiles.filter((tile) => tile.items.length > 0)
}

export function archiveStats(payload: ListsPayload): { total: number; finished: number; average: number | null } {
  const items = LIST_IDS.flatMap((id) => payload.lists[id])
  const finished = items.filter((item) => ['Watched', 'Played', 'Completed', 'Read'].includes(matchStatus(item.listId, item.status).value)).length
  const ratings = items.flatMap((item) => (item.myRating !== null && item.myRating > 0 ? [item.myRating] : []))
  const average = ratings.length === 0 ? null : Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
  return { total: items.length, finished, average }
}
