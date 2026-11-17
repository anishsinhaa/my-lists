import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { SMART_VIEWS, topScore } from '../smart/smartViews'
import { applyListQuery } from './applyListQuery'
import type { ListQuery } from './listQuery'

export function selectItems(listId: ListId, items: MediaItem[], query: ListQuery, now: Date): MediaItem[] {
  const smart = query.smart === null || query.smart.length === 0 ? undefined : SMART_VIEWS[listId].find((view) => view.id === query.smart)
  const base = smart === undefined ? items : smart.apply(items, { now })
  const filtered = applyListQuery(base, query, { now, listId })
  if (query.smart !== 'top-rated') return filtered
  return filtered
    .map((item, index) => ({ item, index, score: topScore(item) ?? -1 }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((row) => row.item)
}
