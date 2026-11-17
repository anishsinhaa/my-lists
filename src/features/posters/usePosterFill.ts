import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLists } from '@/features/data/useLists'
import { externalRatingLabel } from '@/lib/rating'
import { POSTER_LISTS, type ListId } from '@/types/lists'
import type { EnrichField } from '@/types/media'
import { enrichStats, onEnrichStats } from './enrichQueue'

const toasted = new Set<string>()

function columnLabel(listId: ListId, field: EnrichField): string {
  if (field === 'poster') return 'Poster'
  if (field === 'creator') return 'Director/Creator'
  if (field === 'franchise') return 'Franchise'
  return `${externalRatingLabel(listId)} Rating`
}

export function usePosterFill(listId: ListId): { pending: number; done: number; running: boolean; failed: number } {
  const { data } = useLists()
  const [stats, setStats] = useState(() => enrichStats(listId))

  useEffect(() => onEnrichStats(() => setStats(enrichStats(listId))), [listId])

  useEffect(() => {
    if (data === undefined || !(POSTER_LISTS as readonly string[]).includes(listId)) return
    for (const field of ['poster', 'imdbRating'] as const) {
      const key = `${listId}:${field}`
      if (data.columns[listId][field] === false && !toasted.has(key)) {
        toasted.add(key)
        toast.info(`Add a '${columnLabel(listId, field)}' column to enable automatic ${field === 'imdbRating' ? 'ratings' : 'posters'}`)
      }
    }
  }, [data, listId])

  return stats
}
