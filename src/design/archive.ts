import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { externalRatingLabel } from '@/lib/rating'
import { CURRENT_STATUS, matchStatus, shelfOrder, type StatusDef } from './statusConfig'

export interface ShelfGroup {
  status: string
  flavour: string
  family: StatusDef['family']
  icon: StatusDef['icon']
  items: MediaItem[]
  total: number
  loose: boolean
}

const SHELF_CAP = 30

export function shelfGroups(listId: ListId, items: MediaItem[], order: 'title' | 'given' = 'title', cap = SHELF_CAP): ShelfGroup[] {
  const buckets = new Map<string, MediaItem[]>()
  for (const item of items) {
    const matched = matchStatus(listId, item.status)
    const key = matched.value
    const list = buckets.get(key) ?? []
    list.push(item)
    buckets.set(key, list)
  }
  const ordered = shelfOrder(listId).map((row) => row.value)
  const extra = [...buckets.keys()].filter((key) => !ordered.includes(key))
  const groups: ShelfGroup[] = []
  for (const value of [...ordered, ...extra]) {
    const rows = buckets.get(value) ?? []
    if (rows.length === 0) continue
    const def = matchStatus(listId, value)
    const ranked = order === 'given' ? rows : [...rows].sort((left, right) => left.titleKey.localeCompare(right.titleKey) || left.id.localeCompare(right.id))
    groups.push({
      status: def.value,
      flavour: def.flavour,
      family: def.family,
      icon: def.icon,
      items: ranked.slice(0, cap),
      total: rows.length,
      loose: def.value === 'No status',
    })
  }
  return groups
}

export function currentItems(listId: ListId, items: MediaItem[]): MediaItem[] {
  const current = CURRENT_STATUS[listId]
  if (current === null) return []
  return items.filter((item) => matchStatus(listId, item.status).value === current)
}

export interface VisibleRating {
  my: number | null
  external: number | null
  externalLabel: string
}

export function visibleRating(item: Pick<MediaItem, 'myRating' | 'imdbRating' | 'listId'>): VisibleRating {
  return {
    my: shownNumber(item.myRating),
    external: shownNumber(item.imdbRating),
    externalLabel: externalRatingLabel(item.listId),
  }
}

function shownNumber(value: number | null): number | null {
  if (value === null || value <= 0) return null
  return value
}

export function edgeScrollSpeed(pointerX: number, width: number, zone = 0.18): number {
  if (width <= 0) return 0
  const edge = width * zone
  if (pointerX < 0 || pointerX > width) return 0
  if (pointerX < edge) {
    const closeness = 1 - pointerX / edge
    return -Math.round(closeness * closeness * 18)
  }
  if (pointerX > width - edge) {
    const closeness = (pointerX - (width - edge)) / edge
    return Math.round(closeness * closeness * 18)
  }
  return 0
}

export function thumbnailUrl(url: string | null, size: 'w342' | 'w185' | 'w500' = 'w342'): string | null {
  if (url === null || url.length === 0) return null
  const sized = url.replace('/t/p/w500', `/t/p/${size}`).replace('/t/p/original', `/t/p/${size}`)
  if (size === 'w500') return sized
  return sized.replace(/-L\.jpg(?=($|\?))/, '-M.jpg')
}
