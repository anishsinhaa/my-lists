import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatIstDay } from '@/lib/dates'
import { saveItem } from '@/services/sheets/itemApi'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'
import { statusGroupOf } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'

const DONE = new Set(['Watched', 'Played', 'Completed', 'Read'])

export interface ItemPatch {
  status: string
  myRating: number | null
  why?: string
}

function message(outcome: string): string {
  if (outcome === 'not_found') return 'That row is no longer in the sheet'
  if (outcome === 'ambiguous') return 'More than one row matches this title'
  return 'Could not save'
}

function apply(item: MediaItem, patch: ItemPatch): MediaItem {
  const extra = { ...item.extra }
  const finished = (extra['date finished'] ?? '').trim()
  if (!DONE.has(item.status) && DONE.has(patch.status) && finished.length === 0) extra['date finished'] = formatIstDay(new Date())
  return { ...item, status: patch.status, statusGroup: statusGroupOf(patch.status), myRating: patch.myRating, why: patch.why ?? item.why, extra }
}

export function useSaveItem() {
  const queryClient = useQueryClient()
  return useCallback(async (item: MediaItem, patch: ItemPatch) => {
    const previous = queryClient.getQueryData<ListsPayload>(['lists'])
    if (previous !== undefined) {
      const next: ListsPayload = {
        ...previous,
        lists: { ...previous.lists, [item.listId]: previous.lists[item.listId].map((current) => current.id === item.id ? apply(item, patch) : current) },
      }
      queryClient.setQueryData(['lists'], next)
      listsCache.save(next)
    }
    try {
      const result = await saveItem({ listId: item.listId, id: item.id, title: item.title, year: item.year, status: patch.status, myRating: patch.myRating, ...(patch.why === undefined ? {} : { why: patch.why }) })
      if (result.outcome !== 'written') throw new Error(message(result.outcome))
      toast.success('Saved')
      const fresh = await fetchLists({ refresh: true })
      queryClient.setQueryData(['lists'], fresh)
      listsCache.save(fresh)
    } catch (error) {
      if (previous !== undefined) {
        queryClient.setQueryData(['lists'], previous)
        listsCache.save(previous)
      }
      toast.error(error instanceof Error ? error.message : 'Could not save')
      throw error
    }
  }, [queryClient])
}
