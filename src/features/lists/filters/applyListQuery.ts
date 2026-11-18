import { matchStatus } from '@/design/statusConfig'
import { effectiveRating } from '@/lib/rating'
import { normalizeTitle } from '@/lib/normalize'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { ListQuery, SortKey } from './listQuery'

function statusAllowed(raw: string, selected: string[], listId?: ListId): boolean {
  if (selected.length === 0) return true
  const have = raw.trim().toLowerCase()
  return selected.some((status) => {
    if (status.trim().toLowerCase() === have) return true
    return listId !== undefined && matchStatus(listId, status).value.toLowerCase() === matchStatus(listId, raw).value.toLowerCase()
  })
}

function chosenRating(item: MediaItem, query: ListQuery): number | null {
  if (query.ratingBy === 'my') return item.myRating
  if (query.ratingBy === 'external') return item.imdbRating
  return effectiveRating(item)
}

function sortValue(item: MediaItem, sort: SortKey): number | string | null {
  if (sort === 'title') return item.titleKey
  if (sort === 'year') return item.year
  if (sort === 'status') return item.status.length === 0 ? null : item.status.toLowerCase()
  if (sort === 'myRating') return item.myRating
  if (sort === 'imdbRating') return item.imdbRating
  if (sort === 'finished') {
    const finished = (item.extra['date finished'] ?? '').trim()
    return finished.length === 0 ? null : finished
  }
  return effectiveRating(item)
}

function compareValues(left: number | string | null, right: number | string | null, dir: ListQuery['dir']): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  const base = left < right ? -1 : left > right ? 1 : 0
  return dir === 'asc' ? base : -base
}

export function applyListQuery(items: MediaItem[], query: ListQuery, ctx: { now: Date; listId?: ListId }): MediaItem[] {
  const needle = normalizeTitle(query.q)
  const filtered = items.filter((item) => {
    const genreHit = item.genres.some((genre) => normalizeTitle(genre).includes(needle))
    if (needle.length > 0 && !item.titleKey.includes(needle) && !normalizeTitle(item.title).includes(needle) && !genreHit) return false
    if (!statusAllowed(item.status, query.statuses, ctx.listId)) return false
    if (query.genres.length > 0 && !query.genres.some((genre) => item.genres.includes(genre))) return false
    if (query.yearMin !== null || query.yearMax !== null) {
      if (item.year === null) return false
      if (query.yearMin !== null && item.year < query.yearMin) return false
      if (query.yearMax !== null && item.year > query.yearMax) return false
    }
    if (query.franchise !== null && query.franchise.length > 0 && item.franchise !== query.franchise) return false
    if (query.creator !== null && query.creator.length > 0 && item.creator !== query.creator) return false
    if (query.platform !== null && query.platform.length > 0 && item.platform !== query.platform) return false
    if (query.ratingMin !== null) {
      const rating = chosenRating(item, query)
      if (rating === null || rating < query.ratingMin) return false
    }
    const hasPoster = item.poster !== null && item.poster.length > 0
    if (query.poster === 'has' && !hasPoster) return false
    if (query.poster === 'missing' && hasPoster) return false
    return true
  })
  return filtered
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const compared = compareValues(sortValue(left.item, query.sort), sortValue(right.item, query.sort), query.dir)
      return compared === 0 ? left.index - right.index : compared
    })
    .map((entry) => entry.item)
}
