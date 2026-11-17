import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { useLists } from '@/features/data/useLists'
import { readJson, writeJson } from '@/lib/storage'
import { Input } from '@/components/ui/input'
import { LIST_IDS, type ListId } from '@/types/lists'
import { usePosterFill } from '@/features/posters/usePosterFill'
import { FilterBar } from './filters/FilterBar'
import { applyListQuery } from './filters/applyListQuery'
import { parseListQuery, serializeListQuery, type ListQuery, type SortKey } from './filters/listQuery'
import { ListHeader } from './ListHeader'
import { SimpleListPage } from './SimpleListPage'
import { SortMenu } from './SortMenu'
import { SmartViewChips } from './smart/SmartViewChips'
import { SMART_VIEWS } from './smart/smartViews'
import { computeStats } from './stats/computeStats'
import { ViewToggle } from './ViewToggle'
import { ListTable } from './views/ListTable'
import { PosterGrid } from './views/PosterGrid'
import { SplitView } from './views/SplitView'

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
  const stored = readJson<'grid' | 'table'>(`ml.view.${listId}`, 'grid')
  const query = parseListQuery(params)
  if (!params.has('view') && stored === 'table') query.view = 'table'
  const update = (next: ListQuery) => {
    writeJson(`ml.view.${listId}`, next.view)
    setParams(serializeListQuery(next), { replace: true })
  }
  const items = data?.lists[listId] ?? []
  const stats = useMemo(() => computeStats(items), [items])
  const smart = SMART_VIEWS[listId].find((view) => view.id === query.smart)
  const base = smart === undefined ? items : smart.apply(items, { now: new Date() })
  const visible = applyListQuery(base, query, { now: new Date() })
  if (isLoading) return <main className="p-4"><Skeletons count={12} /></main>
  if (data === undefined) return <main className="p-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const poster = items.find((item) => item.poster !== null)?.poster
  return (
    <main className="space-y-4 p-4">
      <ListHeader enriching={enrich.running ? `Enriching ${enrich.done}/${enrich.done + enrich.pending}` : undefined} listId={listId} poster={poster} stats={stats} />
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Search this list" className="max-w-xs" value={query.q} onChange={(event) => update({ ...query, q: event.target.value })} />
        <ViewToggle value={query.view} onChange={(view) => update({ ...query, view })} />
        <SortMenu dir={query.dir} listId={listId} value={query.sort} onChange={(sort: SortKey, dir) => update({ ...query, sort, dir })} />
      </div>
      <SmartViewChips listId={listId} value={query.smart} onChange={(smartId) => update({ ...query, smart: smartId })} />
      <FilterBar items={items} listId={listId} query={query} onChange={update} />
      {visible.length === 0 ? <EmptyState title="No matches" /> : null}
      {smart?.split !== undefined && query.view === 'grid' ? <SplitView items={visible} listId={listId} view={smart} /> : null}
      {smart?.split === undefined && query.view === 'grid' ? <PosterGrid items={visible} listId={listId} /> : null}
      {query.view === 'table' ? <ListTable items={visible} listId={listId} /> : null}
    </main>
  )
}
