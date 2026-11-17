import { LIST_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'
import { matchStatus } from '@/design/statusConfig'

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
  return items.filter((item) => finishedOn(item).length > 0).sort((left, right) => finishedOn(right).localeCompare(finishedOn(left)) || left.titleKey.localeCompare(right.titleKey))
}

export function wallTiles(payload: ListsPayload): WallTile[] {
  const lists = payload.lists
  const watching = [...statusIs(lists.movies, 'movies', ['In progress']), ...statusIs(lists.series, 'series', ['In progress']), ...statusIs(lists.anime, 'anime', ['In progress'])]
  const playing = statusIs(lists.games, 'games', ['Playing'])
  const reading = statusIs(lists.books, 'books', ['Reading'])
  const nextSeason = [...statusIs(lists.series, 'series', ['Next season out']), ...statusIs(lists.anime, 'anime', ['Next season out'])]
  const parked = LIST_IDS.flatMap((id) => statusIs(lists[id], id, ['Paused', 'On hold']))
  const finished = byFinished(LIST_IDS.flatMap((id) => lists[id])).slice(0, 8)
  const rated = LIST_IDS.flatMap((id) => lists[id]).filter((item) => item.myRating !== null && item.myRating > 0).sort((left, right) => (right.myRating ?? 0) - (left.myRating ?? 0)).slice(0, 8)
  const tiles: WallTile[] = [
    { id: 'watching', title: 'Now watching', href: '/lists/movies?status=In%20progress', items: watching },
    { id: 'playing', title: 'Now playing', href: '/lists/games?status=Playing', items: playing },
    { id: 'reading', title: 'Now reading', href: '/lists/books?status=Reading', items: reading },
    { id: 'next', title: 'Next season out', href: '/lists/series?status=Next%20season%20out', items: nextSeason },
    { id: 'paused', title: 'Paused / On hold', href: '/lists/series?status=Paused', items: parked },
    { id: 'finished', title: 'Recently finished', href: '/lists/movies?sort=finished&dir=desc', items: finished },
    { id: 'rated', title: 'Top rated', href: '/lists/movies?sort=myRating', items: rated },
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
