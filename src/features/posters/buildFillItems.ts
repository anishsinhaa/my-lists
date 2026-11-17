import { normalizeTitle } from '@/lib/normalize'
import { POSTER_LISTS, type ListId } from '@/types/lists'
import type { PosterFillItem } from '@/types/api'
import type { EnrichField, ListsPayload, MediaItem } from '@/types/media'
import { isRecentMiss, missKey } from './negativeCache'

const FIELDS: EnrichField[] = ['poster', 'creator', 'franchise', 'imdbRating']

function empty(item: MediaItem, field: EnrichField): boolean {
  if (field === 'imdbRating') return item.imdbRating === null
  return item[field] === null || item[field] === ''
}

export function buildFillItems(payload: ListsPayload, listId: ListId, now: number): PosterFillItem[] {
  if (!(POSTER_LISTS as readonly string[]).includes(listId)) return []
  const columns = payload.columns[listId]
  const items: PosterFillItem[] = []
  for (const item of payload.lists[listId]) {
    const needs = FIELDS.filter((field) => columns[field] === true && empty(item, field) && !isRecentMiss(missKey(listId, item.titleKey || normalizeTitle(item.title), item.year, field), now))
    if (needs.length === 0) continue
    items.push({ tab: listId, title: item.title, year: item.year, needs })
  }
  return items
}
