import { matchStatus, shelfOrder } from '@/design/statusConfig'
import { effectiveRating } from '@/lib/rating'
import { normalizeTitle, sortTitle } from '@/lib/normalize'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { AddedWithin, ListQuery, SortKey } from './listQuery'
import { isNotStarted, isUnratedStarted } from './unrated'

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

function addedStart(now: Date, within: AddedWithin): Date | null {
  if (within === 'any') return null
  const start = new Date(now.getTime())
  if (within === '7d') start.setTime(now.getTime() - 7 * 86_400_000)
  else if (within === '30d') start.setTime(now.getTime() - 30 * 86_400_000)
  else if (within === '3m') start.setUTCMonth(start.getUTCMonth() - 3)
  else start.setUTCMonth(start.getUTCMonth() - 12)
  return start
}

function addedInRange(item: MediaItem, within: AddedWithin, now: Date): boolean {
  const start = addedStart(now, within)
  if (start === null) return true
  if (item.dateAdded === null) return false
  const added = new Date(item.dateAdded)
  if (Number.isNaN(added.getTime())) return false
  return added.getTime() >= start.getTime() && added.getTime() <= now.getTime()
}

function sortValue(item: MediaItem, sort: SortKey, listId?: ListId): number | string | null {
  if (sort === 'added') return item.dateAdded
  if (sort === 'year') return item.year
  if (sort === 'status') {
    if (item.status.trim().length === 0) return null
    if (listId !== 'anime') return item.status.trim().toLowerCase()
    const value = matchStatus('anime', item.status).value
    const index = shelfOrder('anime').findIndex((row) => row.value === value)
    return index === -1 ? shelfOrder('anime').length : index
  }
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
    if (query.unrated && !isUnratedStarted(ctx.listId, item)) return false
    if (query.favWant && !(item.favourite && isNotStarted(ctx.listId, item.status))) return false
    if (query.favWatched && !(item.favourite && !isNotStarted(ctx.listId, item.status))) return false
    if (!addedInRange(item, query.addedWithin, ctx.now)) return false
    return true
  })
  return filtered
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (query.sort === 'title') {
        const compared = sortTitle(left.item.title).localeCompare(sortTitle(right.item.title), 'en', { numeric: true, sensitivity: 'base' })
        if (compared !== 0) return query.dir === 'asc' ? compared : -compared
        const year = compareValues(left.item.year, right.item.year, query.dir)
        return year === 0 ? left.index - right.index : year
      }
      const compared = compareValues(sortValue(left.item, query.sort, ctx.listId), sortValue(right.item, query.sort, ctx.listId), query.dir)
      return compared === 0 ? left.index - right.index : compared
    })
    .map((entry) => entry.item)
}
