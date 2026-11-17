import { shelfGroups, type ShelfGroup } from '@/design/archive'
import { FILTER_CONFIG } from './filterConfig'
import type { GroupKey } from './listQuery'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { ListQuery } from './listQuery'

export function itemGroups(listId: ListId, items: MediaItem[], group: GroupKey): ShelfGroup[] {
  if (group === 'none') return []
  if (group === 'status') return shelfGroups(listId, items, 'given', Number.POSITIVE_INFINITY)
  const empty = emptyLabel(listId, group)
  const buckets = new Map<string, MediaItem[]>()
  for (const item of items) {
    for (const key of keysFor(item, group, empty)) {
      const list = buckets.get(key) ?? []
      list.push(item)
      buckets.set(key, list)
    }
  }
  const labels = [...buckets.keys()].sort((left, right) => {
    const leftLoose = left === empty
    const rightLoose = right === empty
    if (leftLoose !== rightLoose) return leftLoose ? 1 : -1
    if (group === 'year') return right.localeCompare(left)
    const byCount = (buckets.get(right)?.length ?? 0) - (buckets.get(left)?.length ?? 0)
    return byCount === 0 ? left.localeCompare(right) : byCount
  })
  return labels.map((label) => {
    const rows = buckets.get(label) ?? []
    return { status: label, flavour: '', family: 'none', icon: 'bookmark', items: rows, total: rows.length, loose: label === empty }
  })
}

export function focusGroup(group: GroupKey, label: string, loose: boolean): Partial<ListQuery> | null {
  if (loose && group !== 'status') return null
  const flat = { group: 'none' as const, view: 'grid' as const }
  if (group === 'status') return { ...flat, statuses: [label] }
  if (group === 'genre') return { ...flat, genres: [label] }
  if (group === 'creator') return { ...flat, creator: label }
  if (group === 'franchise') return { ...flat, franchise: label }
  if (group === 'platform') return { ...flat, platform: label }
  if (group === 'year') {
    const start = Number(label.slice(0, 4))
    if (!Number.isFinite(start)) return null
    return { ...flat, yearMin: start, yearMax: start + 9 }
  }
  return null
}

function emptyLabel(listId: ListId, group: GroupKey): string {
  const config = FILTER_CONFIG[listId]
  if (group === 'creator') return `No ${config.creatorLabel.toLowerCase()}`
  if (group === 'franchise') return `No ${config.franchiseLabel.toLowerCase()}`
  if (group === 'platform') return 'No platform'
  if (group === 'year') return 'No year'
  return 'No genre'
}

function keysFor(item: MediaItem, group: GroupKey, empty: string): string[] {
  if (group === 'genre') return item.genres.length === 0 ? [empty] : item.genres
  if (group === 'year') return item.year === null ? [empty] : [`${Math.floor(item.year / 10) * 10}s`]
  if (group === 'creator') return item.creator !== null && item.creator.length > 0 ? [item.creator] : [empty]
  if (group === 'franchise') return item.franchise !== null && item.franchise.length > 0 ? [item.franchise] : [empty]
  if (group === 'platform') return item.platform !== null && item.platform.length > 0 ? [item.platform] : [empty]
  return [empty]
}
