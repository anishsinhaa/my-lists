import { LIST_IDS, type ListId, type PicksId } from '@/types/lists'
import type { ListsPayload, MediaItem, PickItem } from '@/types/media'

export function getList(payload: ListsPayload, id: ListId): MediaItem[] {
  return payload.lists[id]
}

export function getPicks(payload: ListsPayload, id: PicksId): PickItem[] {
  return payload.picks[id]
}

export function listCounts(payload: ListsPayload): Record<ListId, number> {
  return Object.fromEntries(LIST_IDS.map((id) => [id, payload.lists[id].length])) as Record<ListId, number>
}

export function allItems(payload: ListsPayload): MediaItem[] {
  return LIST_IDS.flatMap((id) => payload.lists[id])
}
