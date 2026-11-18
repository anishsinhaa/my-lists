import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { useLists } from '@/features/data/useLists'
import { PosterCard } from '@/features/lists/views/PosterCard'
import { itemHref } from '@/features/home/tonight'
import { LIST_IDS, TAB_NAME, type ListId } from '@/types/lists'
import { wallTiles } from './wall'

export function ShelfPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useLists()
  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const tile = wallTiles(data).find((entry) => entry.id === params.tileId)
  if (tile === undefined) {
    return (
      <main className="edge space-y-3 py-6">
        <h1 className="font-['Cinzel',serif] text-2xl">This shelf is empty</h1>
        <Link className="inline-flex min-h-11 items-center text-sm underline" to="/">Back home</Link>
      </main>
    )
  }
  const groups = LIST_IDS.flatMap((id) => {
    const rows = tile.items.filter((item) => item.listId === id)
    return rows.length === 0 ? [] : [{ id, rows }]
  })
  return (
    <main className="edge w-full space-y-6 overflow-x-clip py-4">
      <header className="space-y-1">
        <h1 className="font-['Cinzel',serif] text-3xl">{tile.title}</h1>
        <p className="text-sm text-(--ink-muted)">{tile.items.length}</p>
      </header>
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <h2 className="font-['Cinzel',serif]">{TAB_NAME[group.id as ListId]} · {group.rows.length}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {group.rows.map((item, index) => (
              <PosterCard key={item.id} index={index} item={item} onOpen={(entry) => void navigate(itemHref(entry))} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
