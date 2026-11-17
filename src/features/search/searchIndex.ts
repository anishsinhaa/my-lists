import Fuse from 'fuse.js'
import { LIST_IDS, PICKS_IDS, type ListId } from '@/types/lists'
import type { ListsPayload, MediaItem, PickItem } from '@/types/media'

export type SearchSource = { kind: 'item'; item: MediaItem } | { kind: 'pick'; item: PickItem }

export interface SearchHit {
  id: string
  source: SearchSource
  listId: ListId
  score: number
}

export interface SearchIndex {
  fuse: Fuse<SearchSource>
  size: number
}

export function buildSearchIndex(payload: ListsPayload): SearchIndex {
  const sources: SearchSource[] = [
    ...LIST_IDS.flatMap((id) => payload.lists[id].map((item) => ({ kind: 'item' as const, item }))),
    ...PICKS_IDS.flatMap((id) => payload.picks[id].map((item) => ({ kind: 'pick' as const, item }))),
  ]
  const fuse = new Fuse(sources, {
    keys: [
      { name: 'item.title', weight: 0.7 },
      { name: 'item.franchise', weight: 0.15 },
      { name: 'item.creator', weight: 0.1 },
      { name: 'item.genres', weight: 0.05 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    ignoreDiacritics: true,
    minMatchCharLength: 2,
    includeScore: true,
  })
  return { fuse, size: sources.length }
}

export function searchIndex(index: SearchIndex, query: string, limit = 20): SearchHit[] {
  const text = query.trim()
  if (text.length < 2) return []
  return index.fuse.search(text, { limit }).map((result) => ({
    id: result.item.item.id,
    source: result.item,
    listId: result.item.kind === 'item' ? result.item.item.listId : result.item.item.targetList,
    score: result.score ?? 1,
  }))
}
