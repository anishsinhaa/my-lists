import { useDeferredValue, useMemo } from 'react'
import { useLists } from '@/features/data/useLists'
import { pickTabOn } from '@/features/settings/picksVisibility'
import { useSettings } from '@/features/settings/useSettings'
import { buildSearchIndex, searchIndex, type SearchHit } from './searchIndex'

export function useGlobalSearch(query: string): { hits: SearchHit[]; ready: boolean } {
  const { data } = useLists()
  const settings = useSettings()
  const deferred = useDeferredValue(query)
  const index = useMemo(() => (data === undefined ? null : buildSearchIndex(data)), [data])
  const hits = useMemo(() => {
    const found = index === null ? [] : searchIndex(index, deferred)
    const effective = settings.data?.effective
    if (effective === undefined) return found
    return found.filter((hit) => hit.source.kind !== 'pick' || pickTabOn(hit.source.item.picksId, effective))
  }, [deferred, index, settings.data?.effective])
  return { hits, ready: data !== undefined }
}
