import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { useLists } from '@/features/data/useLists'
import { readJson, writeJson } from '@/lib/storage'
import { LIST_IDS, type ListId } from '@/types/lists'
import { usePosterFill } from '@/features/posters/usePosterFill'
import { parseListQuery, serializeListQuery, type ListQuery } from './filters/listQuery'
import { ListHeader } from './ListHeader'
import { SimpleListPage } from './SimpleListPage'
import { SMART_VIEWS } from './smart/smartViews'
import { computeStats } from './stats/computeStats'
import { SplitView } from './views/SplitView'
import { CategoryView } from './CategoryView'

function NotFound() {
  return <main className="p-6"><h1 className="text-2xl">Not found</h1></main>
}

export function ListPage() {
  const params = useParams()
  const listId = LIST_IDS.find((id) => id === params.listId)
  if (listId === undefined) return <NotFound />
  if (listId === 'other' || listId === 'curious') return <SimpleListPage listId={listId} />
  return <MainList listId={listId} />
}

function MainList({ listId }: { listId: ListId }) {
  const { data, isLoading, error, refetch } = useLists()
  const enrich = usePosterFill(listId)
  const [params, setParams] = useSearchParams()
  const stored = readJson<'shelves' | 'grid' | 'table'>(`ml.view.${listId}`, listId === 'books' ? 'grid' : 'shelves')
  const query = parseListQuery(params)
  if (!params.has('view')) query.view = stored
  const update = (next: ListQuery) => {
    writeJson(`ml.view.${listId}`, next.view)
    setParams(serializeListQuery(next), { replace: true })
  }
  const items = data?.lists[listId] ?? []
  const stats = useMemo(() => computeStats(items), [items])
  const smart = SMART_VIEWS[listId].find((view) => view.id === query.smart)
  const base = smart === undefined ? items : smart.apply(items, { now: new Date() })
  if (isLoading) return <main className="edge py-4"><Skeletons count={12} /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const poster = items.find((item) => item.poster !== null)?.poster
  return (
    <main className="edge w-full space-y-4 overflow-x-clip py-4">
      <ListHeader enriching={enrich.running ? `Enriching ${enrich.done}/${enrich.done + enrich.pending}` : undefined} listId={listId} poster={poster} stats={stats} />
      {smart?.split !== undefined && query.view === 'grid' ? <SplitView items={base} listId={listId} view={smart} /> : <CategoryView items={base} listId={listId} query={query} onChange={update} />}
    </main>
  )
}
