import { LIST_IDS, TAB_NAME } from '@/types/lists'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { listCounts } from './selectors'
import { useLists } from './useLists'

export function ListCounts() {
  const { data, isLoading, error, refetch } = useLists()
  if (isLoading) return <main className="p-6"><Skeletons /></main>
  if (data === undefined) {
    return <main className="p-6"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  }
  const counts = listCounts(data)
  const total = LIST_IDS.reduce((sum, id) => sum + counts[id], 0)
  return (
    <main className="space-y-4 p-6">
      {total === 0 ? <EmptyState title="No rows yet" body="Counts update when the sheet has titles." /> : null}
      <ul className="grid grid-cols-2 gap-3">
        {LIST_IDS.map((id) => (
          <li key={id} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{TAB_NAME[id]}</p>
            <p className="text-2xl font-semibold">{counts[id]}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
