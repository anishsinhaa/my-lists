import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { StatusChip } from '@/components/common/StatusChip'
import { useLists } from '@/features/data/useLists'
import { Input } from '@/components/ui/input'
import { TAB_NAME, type ListId } from '@/types/lists'

export function SimpleListPage({ listId }: { listId: Extract<ListId, 'other' | 'curious'> }) {
  const { data, isLoading, error, refetch } = useLists()
  const [query, setQuery] = useState('')
  const items = data?.lists[listId] ?? []
  const fuse = useMemo(() => new Fuse(items, { keys: ['title'], threshold: 0.35, ignoreLocation: true }), [items])
  const shown = query.trim().length < 2 ? items : fuse.search(query).map((result) => result.item)
  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  return (
    <main className="edge w-full space-y-3 overflow-x-clip py-4">
      <h2 className="font-(--font-display) text-3xl">{TAB_NAME[listId]}</h2>
      <Input aria-label="Search this list" value={query} onChange={(event) => setQuery(event.target.value)} />
      {shown.length === 0 ? <EmptyState title={listId === 'other' ? 'This drawer is empty' : 'Nothing curious yet'} /> : null}
      <ul className="space-y-2">
        {shown.map((item) => (
          <li key={item.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span>{item.title}</span>
              {item.status.length > 0 ? <StatusChip size="sm" status={item.status} /> : null}
            </div>
            <p className="text-sm text-(--ink-muted)">{Object.entries(item.extra).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
