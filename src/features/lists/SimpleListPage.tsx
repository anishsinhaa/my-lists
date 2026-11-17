import { useState } from 'react'
import { useSaveItem } from '@/features/lists/useSaveItem'
import { ItemModal } from '@/features/lists/views/ItemModal'
import { Eraser, X } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { StatusChip } from '@/components/common/StatusChip'
import { useLists } from '@/features/data/useLists'
import { Input } from '@/components/ui/input'
import { displayTitle } from '@/lib/displayTitle'
import { TAB_NAME, type ListId } from '@/types/lists'

export function SimpleListPage({ listId }: { listId: Extract<ListId, 'other' | 'curious'> }) {
  const { data, isLoading, error, refetch } = useLists()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const save = useSaveItem()
  const items = data?.lists[listId] ?? []
  const needle = query.trim().toLowerCase()
  const shown = needle.length === 0 ? items : items.filter((item) => item.title.toLowerCase().includes(needle) || displayTitle(item.title, item.year).toLowerCase().includes(needle))
  const open = openId === null ? null : items.find((item) => item.id === openId) ?? null
  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  return (
    <main className="edge w-full space-y-3 overflow-x-clip py-4">
      <header className="space-y-1">
        <h2 className="font-(--font-display) text-3xl">{TAB_NAME[listId]}</h2>
        <p className="text-xs text-(--ink-muted)">{items.length} titles</p>
      </header>
      <Input aria-label="Search this list" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        {needle.length > 0 ? (
          <button type="button" aria-label={`Remove search ${query.trim()}`} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-(--brass)/50 bg-(--surface) pr-2 pl-3 text-sm" onClick={() => setQuery('')}>
            <span>Search: {query.trim()}</span>
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
        {needle.length > 0 ? (
          <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm" onClick={() => setQuery('')}>
            <Eraser aria-hidden="true" className="size-4" />
            Clear all
          </button>
        ) : null}
        <p className="text-sm text-(--ink-muted) md:ml-auto">Showing {shown.length} of {items.length}</p>
      </div>
      {shown.length === 0 ? <EmptyState title={listId === 'other' ? 'This drawer is empty' : 'Nothing curious yet'} /> : null}
      <ul className="space-y-2">
        {shown.map((item) => (
          <li key={item.id}>
            <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left" onClick={() => setOpenId(item.id)}>
              <span>{displayTitle(item.title, item.year)}</span>
              {item.status.length > 0 ? <StatusChip size="sm" status={item.status} /> : null}
            </button>
          </li>
        ))}
      </ul>
      <ItemModal item={open} items={shown} listId={listId} onClose={() => setOpenId(null)} onOpen={(entry) => setOpenId(entry.id)} onSave={save} />
    </main>
  )
}
