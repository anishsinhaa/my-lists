import { useCallback } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatIstDay } from '@/lib/dates'
import { saveItem } from '@/services/sheets/itemApi'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'
import { statusGroupOf } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'

const DONE = new Set(['Watched', 'Played', 'Completed', 'Read'])

export interface ItemPatch {
  status?: string
  myRating?: number | null
  notes?: string
  favourite?: boolean
}

interface Desired {
  status: string
  myRating: number | null
  notes?: string
  favourite?: boolean
}

interface Lane {
  inflight: boolean
  pending: Desired | null
  epoch: number
  base: ListsPayload | undefined
  hasBase: boolean
}

const lanes = new Map<string, Lane>()

export function resetSaveLanes(): void {
  lanes.clear()
}

function message(outcome: string): string {
  if (outcome === 'not_found') return 'That row is no longer in the sheet'
  if (outcome === 'ambiguous') return 'More than one row matches this title'
  return 'Could not save'
}

function combine(current: MediaItem, pending: Desired | null, patch: ItemPatch): Desired {
  const notes = patch.notes !== undefined ? patch.notes : pending?.notes
  const favourite = patch.favourite !== undefined ? patch.favourite : pending?.favourite
  return {
    status: patch.status ?? pending?.status ?? current.status,
    myRating: patch.myRating !== undefined ? patch.myRating : pending?.myRating !== undefined ? pending.myRating : current.myRating,
    ...(notes === undefined ? {} : { notes }),
    ...(favourite === undefined ? {} : { favourite }),
  }
}

function apply(item: MediaItem, patch: Desired): MediaItem {
  const extra = { ...item.extra }
  const finished = (extra['date finished'] ?? '').trim()
  if (!DONE.has(item.status) && DONE.has(patch.status) && finished.length === 0) extra['date finished'] = formatIstDay(new Date())
  return { ...item, status: patch.status, statusGroup: statusGroupOf(patch.status), myRating: patch.myRating, notes: patch.notes ?? item.notes, favourite: patch.favourite ?? item.favourite, extra }
}

function holdScroll(applyChange: () => void): void {
  const top = window.scrollY
  const rails = [...document.querySelectorAll<HTMLElement>('[data-rail-scroller]')].map((node) => ({ node, left: node.scrollLeft }))
  applyChange()
  requestAnimationFrame(() => {
    if (typeof window.scrollTo === 'function' && Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top)
    for (const rail of rails) {
      if (rail.node.isConnected) rail.node.scrollLeft = rail.left
    }
  })
}

function writeCache(queryClient: QueryClient, next: ListsPayload): void {
  holdScroll(() => {
    queryClient.setQueryData(['lists'], next)
    listsCache.save(next)
  })
}

function publish(queryClient: QueryClient, item: MediaItem, patch: Desired): void {
  const previous = queryClient.getQueryData<ListsPayload>(['lists'])
  if (previous === undefined) return
  const next: ListsPayload = {
    ...previous,
    lists: { ...previous.lists, [item.listId]: previous.lists[item.listId].map((current) => current.id === item.id ? apply(current, patch) : current) },
  }
  writeCache(queryClient, next)
}

function reconcile(current: ListsPayload, fresh: ListsPayload, item: MediaItem): ListsPayload {
  const server = fresh.lists[item.listId].find((row) => row.id === item.id)
  if (server === undefined) return current
  return {
    ...current,
    lists: {
      ...current.lists,
      [item.listId]: current.lists[item.listId].map((row) => row.id === item.id ? server : row),
    },
  }
}

async function drain(item: MediaItem, queryClient: QueryClient): Promise<void> {
  const lane = lanes.get(item.id)
  if (lane === undefined || lane.inflight) return
  lane.inflight = true
  let phase: 'write' | 'refresh' = 'write'
  try {
    while (lane.pending !== null) {
      const desired = lane.pending
      lane.pending = null
      const result = await saveItem({
        listId: item.listId,
        id: item.id,
        title: item.title,
        year: item.year,
        status: desired.status,
        myRating: desired.myRating,
        ...(desired.notes === undefined ? {} : { notes: desired.notes }),
        ...(desired.favourite === undefined ? {} : { favourite: desired.favourite }),
      })
      if (result.outcome !== 'written') throw new Error(message(result.outcome))
    }
    phase = 'refresh'
    const epoch = lane.epoch
    const fresh = await fetchLists({ refresh: true })
    const latest = lanes.get(item.id)
    const current = queryClient.getQueryData<ListsPayload>(['lists'])
    if (latest !== undefined && current !== undefined && latest.epoch === epoch && latest.pending === null) {
      writeCache(queryClient, reconcile(current, fresh, item))
    }
  } catch (error) {
    if (phase === 'refresh') {
      return
    } else {
      const latest = lanes.get(item.id)
      if (latest !== undefined) {
        latest.pending = null
        if (latest.hasBase && latest.base !== undefined) writeCache(queryClient, latest.base)
      }
      toast.error(error instanceof Error ? error.message : 'Could not save')
      throw error
    }
  } finally {
    const latest = lanes.get(item.id)
    if (latest !== undefined) latest.inflight = false
    if (latest !== undefined && latest.pending !== null) void drain(item, queryClient)
  }
}

export function useSaveItem() {
  const queryClient = useQueryClient()
  return useCallback(async (item: MediaItem, patch: ItemPatch) => {
    let lane = lanes.get(item.id)
    if (lane === undefined) {
      lane = { inflight: false, pending: null, epoch: 0, base: undefined, hasBase: false }
      lanes.set(item.id, lane)
    }
    if (!lane.inflight && lane.pending === null) {
      lane.base = queryClient.getQueryData<ListsPayload>(['lists'])
      lane.hasBase = true
    }
    const data = queryClient.getQueryData<ListsPayload>(['lists'])
    const current = data?.lists[item.listId].find((entry) => entry.id === item.id) ?? item
    const desired = combine(current, lane.pending, patch)
    lane.pending = desired
    lane.epoch += 1
    publish(queryClient, current, desired)
    return drain(item, queryClient)
  }, [queryClient])
}
