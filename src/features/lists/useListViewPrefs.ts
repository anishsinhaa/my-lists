import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { writeJson } from '@/lib/storage'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { serializeListQuery, type ListQuery } from './filters/listQuery'
import { applyUrl, catalogFrom, prefsKey, pruneQuery, queryToStored, readStoredQuery, sameQuery } from './viewPrefs'

function load(listId: ListId, params: URLSearchParams): ListQuery {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(prefsKey(listId))
  } catch {
    raw = null
  }
  return applyUrl(readStoredQuery(listId, raw), params)
}

export function useListViewPrefs(listId: ListId, items: MediaItem[], ready: boolean): {
  query: ListQuery
  commit: (next: ListQuery) => void
} {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(() => load(listId, params))
  const [forList, setForList] = useState(listId)
  const writing = useRef(false)
  if (forList !== listId) {
    setForList(listId)
    setQuery(load(listId, params))
  }
  const catalog = useMemo(() => ready ? catalogFrom(items) : null, [items, ready])
  if (catalog !== null) {
    const pruned = pruneQuery(query, catalog)
    if (!sameQuery(pruned, query)) setQuery(pruned)
  }

  useEffect(() => {
    if (writing.current) {
      writing.current = false
      return
    }
    setQuery(load(listId, params))
  }, [listId, params])

  useEffect(() => {
    const handle = window.setTimeout(() => writeJson(prefsKey(listId), queryToStored(query)), 150)
    return () => window.clearTimeout(handle)
  }, [listId, query])

  function commit(next: ListQuery) {
    writing.current = true
    setQuery(next)
    const serialized = serializeListQuery(next)
    const item = params.get('item')
    if (item !== null && item.length > 0) serialized.set('item', item)
    setParams(serialized, { replace: true })
  }

  return { query, commit }
}
