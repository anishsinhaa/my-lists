import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'

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
