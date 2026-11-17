import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { listCounts } from '@/features/data/selectors'
import { useLists } from '@/features/data/useLists'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ListCarousel } from './ListCarousel'
import { ListCategoryCard, postersFor } from './ListCategoryCard'

export function MyListsPage() {
  const desktop = useMediaQuery('(min-width: 768px)')
  const { data, isLoading, error, refetch } = useLists()
  if (isLoading) return <main className="p-4"><Skeletons /></main>
  if (data === undefined) return <main className="p-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const counts = listCounts(data)
  const order = ['movies', 'series', 'anime', 'games', 'books'] as const
  return (
    <main className="overflow-x-hidden p-4">
      {desktop ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {order.map((id) => <ListCategoryCard key={id} count={counts[id]} items={data.lists[id]} listId={id} posters={postersFor(data.lists[id])} to={`/lists/${id}`} variant="tile" />)}
        </div>
      ) : <ListCarousel counts={counts} lists={data.lists} />}
      {order.every((id) => counts[id] === 0) ? <EmptyState title="No rows yet" /> : null}
      <div className="mt-4 flex gap-4 text-sm">
        <Link to="/lists/other">Other</Link>
        <Link to="/lists/curious">Curious</Link>
      </div>
    </main>
  )
}
