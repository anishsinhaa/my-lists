import { useDeferredValue, useMemo } from 'react'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { pickTabOn } from '@/features/settings/picksVisibility'
import { useSettings } from '@/features/settings/useSettings'
import { buildSearchIndex, searchIndex, type SearchHit } from './searchIndex'

export function useGlobalSearch(query: string): { hits: SearchHit[]; ready: boolean } {
  const { data } = useLists()
  const settings = useSettings()
  const canEdit = useCanEdit()
  const deferred = useDeferredValue(query)
  const index = useMemo(() => (data === undefined ? null : buildSearchIndex(data)), [data])
  const hits = useMemo(() => {
    const found = index === null ? [] : searchIndex(index, deferred)
    const effective = settings.data?.effective
    return found.filter((hit) => {
      if (hit.source.kind !== 'pick') return true
      if (!canEdit) return false
      if (effective === undefined) return true
      return pickTabOn(hit.source.item.picksId, effective)
    })
  }, [canEdit, deferred, index, settings.data?.effective])
  return { hits, ready: data !== undefined }
}
