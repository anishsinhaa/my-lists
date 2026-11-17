import { useDeferredValue, useMemo } from 'react'
import { useLists } from '@/features/data/useLists'
import { buildSearchIndex, searchIndex, type SearchHit } from './searchIndex'

export function useGlobalSearch(query: string): { hits: SearchHit[]; ready: boolean } {
  const { data } = useLists()
  const deferred = useDeferredValue(query)
  const index = useMemo(() => (data === undefined ? null : buildSearchIndex(data)), [data])
  const hits = useMemo(() => (index === null ? [] : searchIndex(index, deferred)), [deferred, index])
  return { hits, ready: data !== undefined }
}
