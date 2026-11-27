import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { PosterSkeletons } from '@/components/common/PosterSkeletons'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { useLists } from '@/features/data/useLists'
import { LIST_IDS, type ListId } from '@/types/lists'
import { usePosterFill } from '@/features/posters/usePosterFill'
import { useListViewPrefs } from './useListViewPrefs'
import { ListHeader } from './ListHeader'
import { SimpleListPage } from './SimpleListPage'
import { TonightButton, TonightModal } from '@/features/home/TonightModal'
import { CategoryView } from './CategoryView'

export function ListPage() {
  const params = useParams()
  const listId = LIST_IDS.find((id) => id === params.listId)
  if (listId === undefined) return <NotFoundPage kind="list" />
  if (listId === 'other' || listId === 'curious') return <SimpleListPage listId={listId} />
  return <MainList listId={listId} />
}

function MainList({ listId }: { listId: ListId }) {
  const { data, isLoading, error, refetch } = useLists()
  const enrich = usePosterFill(listId)
  const [tonight, setTonight] = useState(false)
  const [params, setParams] = useSearchParams()
  const ready = data !== undefined && !isLoading
  const { query, commit } = useListViewPrefs(listId, data?.lists[listId] ?? [], ready)
  const openItemId = params.get('item')
  function closeItem() {
    if (!params.has('item')) return
    const next = new URLSearchParams(params)
    next.delete('item')
    setParams(next, { replace: true })
  }
  const items = data?.lists[listId] ?? []
  if (isLoading) return <main className="edge py-4"><PosterSkeletons count={12} /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const poster = items.find((item) => item.poster !== null)?.poster
  const enriching = enrich.running ? `Enriching ${enrich.done}/${enrich.done + enrich.pending}` : undefined
  return (
    <main className="edge w-full space-y-4 overflow-x-clip py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{listId === 'series' ? null : <ListHeader enriching={enriching} listId={listId} poster={poster} />}</div>
        <TonightButton onClick={() => setTonight(true)} />
      </div>
      <CategoryView enriching={enriching} items={items} listId={listId} openItemId={openItemId} query={query} onChange={commit} onItemClose={closeItem} />
      {tonight && data !== undefined ? <TonightModal lists={data.lists} preset={listId} onClose={() => setTonight(false)} /> : null}
    </main>
  )
}
