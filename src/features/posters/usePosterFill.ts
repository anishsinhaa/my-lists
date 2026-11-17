import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { patchListResult } from '@/features/data/useLists'
import { useLists } from '@/features/data/useLists'
import { externalRatingLabel } from '@/lib/rating'
import { fillPosters } from '@/services/images/posterApi'
import { POSTER_LISTS, type ListId } from '@/types/lists'
import type { PosterFillItem } from '@/types/api'
import type { EnrichField } from '@/types/media'
import { buildFillItems } from './buildFillItems'
import { markMiss, missKey } from './negativeCache'

const toasted = new Set<string>()

function columnLabel(listId: ListId, field: EnrichField): string {
  if (field === 'poster') return 'Poster'
  if (field === 'creator') return 'Director/Creator'
  if (field === 'franchise') return 'Franchise'
  return `${externalRatingLabel(listId)} Rating`
}

export function usePosterFill(listId: ListId): { pending: number; done: number; running: boolean; failed: number } {
  const { data } = useLists()
  const queryClient = useQueryClient()
  const [state, setState] = useState({ pending: 0, done: 0, running: false, failed: 0 })

  useEffect(() => {
    if (data === undefined || !(POSTER_LISTS as readonly string[]).includes(listId)) return
    const payload = data
    for (const field of ['poster', 'creator', 'franchise', 'imdbRating'] as const) {
      const key = `${listId}:${field}`
      if (data.columns[listId][field] === false && !toasted.has(key)) {
        toasted.add(key)
        toast.info(`Add a '${columnLabel(listId, field)}' column to enable automatic ${field === 'imdbRating' ? 'ratings' : 'posters'}`)
      }
    }
    const items = buildFillItems(data, listId, Date.now())
    if (items.length === 0) return
    const controller = new AbortController()
    let cancelled = false
    const onHide = () => { if (document.hidden) controller.abort() }
    document.addEventListener('visibilitychange', onHide)
    setState({ pending: items.length, done: 0, running: true, failed: 0 })
    void run(items)
    return () => {
      cancelled = true
      controller.abort()
      document.removeEventListener('visibilitychange', onHide)
    }

    async function run(queue: PosterFillItem[]) {
      const retry: PosterFillItem[] = []
      let done = 0
      let failed = 0
      for (let index = 0; index < queue.length; index += 8) {
        if (cancelled || controller.signal.aborted || document.hidden) return
        const batch = queue.slice(index, index + 8)
        try {
          const results = await fillPosters(batch, controller.signal)
          results.forEach((result, resultIndex) => {
            const source = batch[resultIndex]
            if (source === undefined) return
            if (result.outcome === 'provider_error') {
              retry.push(source)
              return
            }
            if (result.outcome !== 'already_filled') patchListResult(queryClient, listId, result, source.year)
            for (const field of result.missed) markMiss(missKey(listId, result.titleKey, source.year, field))
          })
        } catch {
          retry.push(...batch)
        }
        done += batch.length
        setState({ pending: queue.length - done, done, running: true, failed })
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      for (const item of retry) {
        if (cancelled || controller.signal.aborted) return
        try {
          const [result] = await fillPosters([item], controller.signal)
          if (result !== undefined && result.outcome !== 'provider_error' && result.outcome !== 'already_filled') patchListResult(queryClient, listId, result, item.year)
          if (result?.outcome === 'provider_error') failed += 1
        } catch {
          failed += 1
        }
      }
      const postersMissing = payload.lists[listId].filter((item) => item.poster === null).length
      if (payload.lists[listId].length > 0 && postersMissing / payload.lists[listId].length > 0.5) toast.info('Most posters are still missing. Table view may be easier.')
      setState({ pending: 0, done: queue.length, running: false, failed })
    }
  }, [data?.dataHash, listId, queryClient])

  return state
}
