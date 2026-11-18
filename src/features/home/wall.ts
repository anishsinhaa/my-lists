import { matchStatus } from '@/design/statusConfig'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'

export const MY_RATING_MIN = 0.1
const FINISHED = ['Watched', 'Played', 'Completed', 'Read']

export interface WallTile {
  id: string
  title: string
  href: string
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

function categoryHref(listId: ListId, options: { statuses?: string[]; sort?: string; dir?: 'asc' | 'desc'; ratingMin?: number }): string {
  const params = new URLSearchParams()
  if (options.statuses !== undefined && options.statuses.length > 0) params.set('status', options.statuses.join(','))
  if (options.sort !== undefined) params.set('sort', options.sort)
  if (options.dir !== undefined) params.set('dir', options.dir)
  if (options.ratingMin !== undefined) {
    params.set('rmin', String(options.ratingMin))
    params.set('rby', 'my')
  }
  const query = params.toString()
  return query.length === 0 ? `/lists/${listId}` : `/lists/${listId}?${query}`
}

function tileHref(id: string, items: MediaItem[], options: { statuses?: string[]; sort?: string; dir?: 'asc' | 'desc'; ratingMin?: number }): string {
  const listId = soleList(items)
  if (listId === null) return `/shelf/${id}`
  return categoryHref(listId, options)
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
  const tiles: WallTile[] = [
    { id: 'watching', title: 'Now watching', href: tileHref('watching', watching, { statuses: ['In progress'] }), items: watching },
    { id: 'playing', title: 'Now playing', href: tileHref('playing', playing, { statuses: ['Playing', 'In progress'] }), items: playing },
    { id: 'reading', title: 'Now reading', href: tileHref('reading', reading, { statuses: ['Reading', 'In progress'] }), items: reading },
    { id: 'next', title: 'Next season out', href: tileHref('next', nextSeason, { statuses: ['Next season out'] }), items: nextSeason },
    { id: 'paused', title: 'Paused / On hold', href: tileHref('paused', parked, { statuses: ['Paused', 'On hold'] }), items: parked },
    { id: 'finished', title: 'Recently finished', href: tileHref('finished', finished, { statuses: FINISHED, sort: 'finished', dir: 'desc' }), items: finished },
    { id: 'rated', title: 'Top rated', href: tileHref('rated', rated, { sort: 'myRating', dir: 'desc', ratingMin: MY_RATING_MIN }), items: rated },
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
