import { POSTER_LISTS, type ListId } from '@/types/lists'
import type { PosterFillItem } from '@/types/api'
import type { EnrichField, ListsPayload, MediaItem } from '@/types/media'

const FIELDS: EnrichField[] = ['poster', 'imdbRating']

function empty(item: MediaItem, field: EnrichField): boolean {
  if (field === 'imdbRating') return item.imdbRating === null
  return item[field] === null || item[field] === ''
}

export function buildFillItems(payload: ListsPayload, listId: ListId): PosterFillItem[] {
  if (!(POSTER_LISTS as readonly string[]).includes(listId)) return []
  const columns = payload.columns[listId]
  const items: PosterFillItem[] = []
  for (const item of payload.lists[listId]) {
    const needs = FIELDS.filter((field) => columns[field] === true && empty(item, field))
    if (needs.length === 0) continue
    items.push({ tab: listId, title: item.title, year: item.year, needs })
  }
  return items
}
