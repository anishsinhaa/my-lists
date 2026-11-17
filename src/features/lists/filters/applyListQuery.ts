import { effectiveRating } from '@/lib/rating'
import { normalizeTitle } from '@/lib/normalize'
import type { MediaItem } from '@/types/media'
import type { ListQuery, SortKey } from './listQuery'

function chosenRating(item: MediaItem, query: ListQuery): number | null {
  if (query.ratingBy === 'my') return item.myRating
  if (query.ratingBy === 'external') return item.imdbRating
  return effectiveRating(item)
}

function sortValue(item: MediaItem, sort: SortKey): number | string | null {
  if (sort === 'title') return item.titleKey
  if (sort === 'year') return item.year
  if (sort === 'status') return item.status.length === 0 ? null : item.status.toLowerCase()
  if (sort === 'updated') return item.updatedAt
  if (sort === 'myRating') return item.myRating
  if (sort === 'imdbRating') return item.imdbRating
  return effectiveRating(item)
}

function compareValues(left: number | string | null, right: number | string | null, dir: ListQuery['dir']): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  const base = left < right ? -1 : left > right ? 1 : 0
  return dir === 'asc' ? base : -base
}

export function applyListQuery(items: MediaItem[], query: ListQuery, _ctx: { now: Date }): MediaItem[] {
  const needle = normalizeTitle(query.q)
  const filtered = items.filter((item) => {
    if (needle.length > 0 && !item.titleKey.includes(needle) && !normalizeTitle(item.title).includes(needle)) return false
    if (query.statuses.length > 0 && !query.statuses.includes(item.status)) return false
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
