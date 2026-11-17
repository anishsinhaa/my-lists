import { useEffect } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'
import type { PosterFillResult } from '@/types/api'
import type { ListId } from '@/types/lists'
import type { ListsPayload, MediaItem } from '@/types/media'

export function patchListResult(queryClient: QueryClient, listId: ListId, result: PosterFillResult, year: number | null): void {
  queryClient.setQueryData<ListsPayload>(['lists'], (current) => {
    if (current === undefined) return current
    const next = current.lists[listId].map((item) => applyWritten(item, result, year))
    const payload = { ...current, lists: { ...current.lists, [listId]: next } }
    listsCache.save(payload)
    return payload
  })
}

function applyWritten(item: MediaItem, result: PosterFillResult, year: number | null): MediaItem {
  if (item.titleKey !== result.titleKey || item.year !== year) return item
  return {
    ...item,
    poster: result.written.poster === true ? result.poster : item.poster,
    creator: result.written.creator === true ? result.creator : item.creator,
    franchise: result.written.franchise === true ? result.franchise : item.franchise,
    imdbRating: result.written.imdbRating === true ? result.imdbRating : item.imdbRating,
  }
}

export function useLists() {
  const queryClient = useQueryClient()
  const cached = listsCache.load()
  const query = useQuery({
    queryKey: ['lists'],
    queryFn: () => fetchLists(),
    staleTime: 60_000,
    gcTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    initialData: cached ?? undefined,
    placeholderData: cached ?? undefined,
  })

  useEffect(() => {
    if (query.data !== undefined) listsCache.save(query.data)
  }, [query.data])

  useEffect(() => {
    if (query.error instanceof Error && query.data !== undefined) toast.error(query.error.message)
  }, [query.data, query.error])

  return {
    data: query.data,
    isLoading: query.data === undefined && query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    updatedAt: query.dataUpdatedAt,
    refetch: async () => {
      const data = await fetchLists({ refresh: true })
      queryClient.setQueryData(['lists'], data)
      listsCache.save(data)
      return data
    },
  }
}
