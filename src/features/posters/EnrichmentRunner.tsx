import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { patchListResult, useLists } from '@/features/data/useLists'
import { POSTER_LISTS, type ListId } from '@/types/lists'
import { buildFillItems } from './buildFillItems'
import { enqueueFills, onEnrichResult } from './enrichQueue'

export function EnrichmentRunner() {
  const { data } = useLists()
  const queryClient = useQueryClient()
  const hash = data?.dataHash

  useEffect(() => onEnrichResult((result, item) => {
    if (result.outcome === 'already_filled') return
    if (!Object.values(result.written).some(Boolean)) return
    if (!(POSTER_LISTS as readonly string[]).includes(item.tab)) return
    patchListResult(queryClient, item.tab as ListId, result, item.year)
  }), [queryClient])

  useEffect(() => {
    if (data === undefined) return
    enqueueFills(POSTER_LISTS.flatMap((listId) => buildFillItems(data, listId)))
  }, [data, hash])

  return null
}
