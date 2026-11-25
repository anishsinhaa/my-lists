import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { postPickStatus } from '@/services/sheets/picksApi'
import { PICKS_SKIPPED_KEY, type PickAction } from '@/types/picks'
import type { PicksId } from '@/types/lists'
import type { ListsPayload, PickItem } from '@/types/media'

function readSkipped(): string[] {
  try {
    const raw = sessionStorage.getItem(PICKS_SKIPPED_KEY)
    const parsed: unknown = raw === null ? [] : JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

function writeSkipped(ids: string[]) {
  sessionStorage.setItem(PICKS_SKIPPED_KEY, JSON.stringify(ids))
}

type Undo = { type: 'skip'; id: string } | { type: 'status'; item: PickItem; status: string }

export function usePicksQueue(picksId: PicksId) {
  const { data } = useLists()
  const queryClient = useQueryClient()
  const editable = useCanEdit()
  const [skipped, setSkipped] = useState<string[]>(() => readSkipped())
  const [undoStack, setUndoStack] = useState<Undo[]>([])
  const [syncing, setSyncing] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const queue = useMemo(() => (data?.picks[picksId] ?? []).filter((item) => item.status === '' && !skipped.includes(item.id)), [data, picksId, skipped])

  const patch = (item: PickItem, status: string) => {
    queryClient.setQueryData<ListsPayload>(['lists'], (current) => {
      if (current === undefined) return current
      return { ...current, picks: { ...current.picks, [picksId]: current.picks[picksId].map((pick) => pick.id === item.id ? { ...pick, status } : pick) } }
    })
  }

  const act = (action: PickAction) => {
    const current = queue[0]
    if (current === undefined) return
    if (action.type === 'skip') {
      const next = [...skipped, current.id]
      setSkipped(next)
      writeSkipped(next)
      setUndoStack((stack) => [...stack, { type: 'skip', id: current.id }])
      return
    }
    if (!editable) {
      window.dispatchEvent(new Event('ml:forbidden'))
      return
    }
    setUndoStack((stack) => [...stack, { type: 'status', item: current, status: action.status }])
    patch(current, action.status)
    setSyncing((count) => count + 1)
    void postPickStatus({ picksId, title: current.title, year: current.year, because: current.becauseYouLiked, status: action.status, expectedCurrent: '' })
      .then((result) => {
        if (result.outcome === 'conflict') toast.error(`Changed elsewhere to ${result.currentValue ?? 'another value'}; card removed`)
        if (result.outcome === 'not_found') toast.error('That pick is no longer in the sheet')
        if (result.outcome !== 'written') patch(current, result.currentValue ?? current.status)
      })
      .catch((error: unknown) => setLastError(error instanceof Error ? error.message : 'Could not save'))
      .finally(() => setSyncing((count) => count - 1))
  }

  const undo = () => {
    const last = undoStack.at(-1)
    if (last === undefined) return
    setUndoStack((stack) => stack.slice(0, -1))
    if (last.type === 'skip') {
      const next = skipped.filter((id) => id !== last.id)
      setSkipped(next)
      writeSkipped(next)
      return
    }
    if (!editable) return
    patch(last.item, '')
    setSyncing((count) => count + 1)
    void postPickStatus({ picksId, title: last.item.title, year: last.item.year, because: last.item.becauseYouLiked, status: '', expectedCurrent: last.status })
      .finally(() => setSyncing((count) => count - 1))
  }

  return { current: queue[0] ?? null, upcoming: queue.slice(1, 3), remaining: queue.length, act, undo, canUndo: undoStack.length > 0, syncing, lastError }
}
