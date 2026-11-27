import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TonightButton, TonightModal } from '@/features/home/TonightModal'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from '@/features/lists/useSaveItem'
import { ItemModal } from '@/features/lists/views/ItemModal'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { StatusChip } from '@/components/common/StatusChip'
import { useLists } from '@/features/data/useLists'
import { displayTitle } from '@/lib/displayTitle'
import { TAB_NAME, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { FilterChrome } from './filters/FilterChrome'
import { selectItems } from './filters/selectItems'
import { useListViewPrefs } from './useListViewPrefs'

const EMPTY: MediaItem[] = []
const QUERY_NOW = new Date('2026-01-01T00:00:00.000Z')

export function SimpleListPage({ listId }: { listId: Extract<ListId, 'other' | 'curious'> }) {
  const { data, isLoading, error, refetch } = useLists()
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('item')
  const [tonight, setTonight] = useState(false)
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
  const shown = useMemo(() => selectItems(listId, items, query, QUERY_NOW), [items, listId, query])
  const open = openId === null ? null : items.find((item) => item.id === openId) ?? null
  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  return (
    <main className="edge w-full space-y-3 overflow-x-clip py-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-(--font-display) text-3xl">{TAB_NAME[listId]}</h2>
          <p className="text-xs text-(--ink-muted)">{items.length} titles</p>
        </div>
        <TonightButton onClick={() => setTonight(true)} />
      </header>
      <FilterChrome items={items} listId={listId} query={query} shown={shown.length} total={items.length} onChange={(partial) => commit({ ...query, ...partial })} />
      {shown.length === 0 ? <EmptyState title={listId === 'other' ? 'This drawer is empty' : 'Nothing curious yet'} /> : null}
      <ul className="space-y-2">
        {shown.map((item) => (
          <li key={item.id}>
            <button type="button" className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border p-3 text-left ${listId === 'other' ? 'other-row' : 'curious-row'}`} onClick={() => setOpenId(item.id)}>
              <span>{displayTitle(item.title, item.year)}</span>
              {item.status.length > 0 ? <StatusChip size="sm" status={item.status} /> : null}
            </button>
          </li>
        ))}
      </ul>
      <ItemModal item={open} items={shown} listId={listId} readOnly={!canEdit} onClose={() => { setOpenId(null); if (params.has('item')) { const next = new URLSearchParams(params); next.delete('item'); setParams(next, { replace: true }) } }} onOpen={(entry) => setOpenId(entry.id)} onSave={save} />
      {tonight && data !== undefined ? <TonightModal lists={data.lists} preset={listId} onClose={() => setTonight(false)} /> : null}
    </main>
  )
}
