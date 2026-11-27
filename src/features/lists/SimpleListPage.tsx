import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from '@/features/lists/useSaveItem'
import { ItemModal } from '@/features/lists/views/ItemModal'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PosterSkeletons } from '@/components/common/PosterSkeletons'
import { useLists } from '@/features/data/useLists'
import { TAB_NAME, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { NoteCard } from './cards/NoteCard'
import { FilterChrome } from './filters/FilterChrome'
import { CLEARED_FILTERS, hasActiveFilters } from './filters/listQuery'
import { selectItems } from './filters/selectItems'
import { useListViewPrefs } from './useListViewPrefs'
import { ListTable } from './views/ListTable'

const EMPTY: MediaItem[] = []
const LAYOUT = ['grid', 'table'] as const
const EXTRA = [
  { key: 'type', label: 'Type' },
  { key: 'source', label: 'Source' },
]

export function SimpleListPage({ listId }: { listId: Extract<ListId, 'other' | 'curious'> }) {
  const { data, isLoading, error, refetch } = useLists()
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('item')
  const [openId, setOpenId] = useState<string | null>(fromUrl)
  const [trackedItem, setTrackedItem] = useState(fromUrl)
  if (fromUrl !== trackedItem) {
    setTrackedItem(fromUrl)
    if (fromUrl !== null && fromUrl.length > 0) setOpenId(fromUrl)
  }
  const canEdit = useCanEdit()
  const save = useSaveItem()
  const items = data?.lists[listId] ?? EMPTY
  const ready = data !== undefined && !isLoading
  const { query, commit } = useListViewPrefs(listId, items, ready)
  const view = query.view === 'shelves' ? 'grid' : query.view
  const shownQuery = view === query.view ? query : { ...query, view }
  const [now] = useState(() => new Date())
  const shown = useMemo(() => selectItems(listId, items, query, now), [items, listId, query, now])
  const open = openId === null ? null : items.find((item) => item.id === openId) ?? null
  const filtered = hasActiveFilters(query)
  if (isLoading) return <main className="edge py-4"><PosterSkeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  return (
    <main className="edge w-full space-y-3 overflow-x-clip py-4">
      <header className="space-y-1">
        <h2 className="font-(--font-display) text-3xl">{TAB_NAME[listId]}</h2>
        <p className="text-xs text-(--ink-muted)">{items.length} titles</p>
      </header>
      <FilterChrome items={items} layoutOptions={LAYOUT} listId={listId} query={shownQuery} shown={shown.length} total={items.length} onChange={(partial) => commit({ ...query, ...partial })} />
      {shown.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nothing matches' : listId === 'other' ? 'This drawer is empty' : 'Nothing curious yet'}
          body={filtered ? 'Nothing matches these filters.' : undefined}
          action={filtered ? <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => commit({ ...query, ...CLEARED_FILTERS })}>Clear filters</button> : undefined}
        />
      ) : view === 'table' ? (
        <ListTable extraColumns={EXTRA} items={shown} listId={listId} onOpen={(item) => setOpenId(item.id)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => <NoteCard key={item.id} item={item} listId={listId} onOpen={(entry) => setOpenId(entry.id)} />)}
        </div>
      )}
      <ItemModal item={open} items={shown} listId={listId} readOnly={!canEdit} onClose={() => { setOpenId(null); if (params.has('item')) { const next = new URLSearchParams(params); next.delete('item'); setParams(next, { replace: true }) } }} onOpen={(entry) => setOpenId(entry.id)} onSave={save} />
    </main>
  )
}
