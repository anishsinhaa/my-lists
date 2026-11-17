import { Link } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { Plaque } from '@/design/Plaque'
import { Rail } from '@/design/Rail'
import { thumbnailUrl } from '@/design/archive'
import { listCounts } from '@/features/data/selectors'
import { useLists } from '@/features/data/useLists'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { LIST_KIND, TAB_NAME } from '@/types/lists'
import type { MediaItem } from '@/types/media'

const ORDER = ['movies', 'series', 'anime', 'games', 'books'] as const

function covers(items: MediaItem[]): MediaItem[] {
  return [...items].filter((item) => item.poster !== null).sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')).slice(0, 4)
}

function PortraitCard({ listId, items, count }: { listId: (typeof ORDER)[number]; items: MediaItem[]; count: number }) {
  const stack = covers(items)
  const active = items.filter((item) => item.statusGroup === 'active').length
  const done = items.filter((item) => item.statusGroup === 'done').length
  return (
    <Link to={`/lists/${listId}`} data-theme={listId} data-rail-card="true" className="flex w-full shrink-0 snap-start flex-col gap-3 text-(--ink) focus-visible:outline-2 focus-visible:outline-(--brass) md:w-[300px]">
      <Plaque>{TAB_NAME[listId]}</Plaque>
      <span className={`relative block h-[420px] overflow-hidden border border-(--brass)/50 bg-(--surface) ${listId === 'movies' ? 'px-3' : ''}`}>
        {listId === 'movies' ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-[radial-gradient(circle,#111_3px,transparent_4px)] bg-[length:12px_16px]" /> : null}
        {listId === 'series' ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_2px,#00000033_3px)]" /> : null}
        {listId === 'anime' ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 opacity-30 halftone" /> : null}
        <span className="absolute inset-6 flex items-end justify-center">
          {stack.length === 0 ? <PosterImage alt="" kind={LIST_KIND[listId]} src={null} title={TAB_NAME[listId]} className="w-40" /> : stack.map((item, index) => (
            <span key={item.id} className="absolute w-36 shadow-xl" style={{ transform: `rotate(${(index - 1.5) * 6}deg) translateY(${index * -6}px)`, zIndex: index }}>
              <PosterImage alt="" kind={LIST_KIND[listId]} src={thumbnailUrl(item.poster, 'w342')} title={item.title} />
            </span>
          ))}
        </span>
      </span>
      <span className="text-sm">{count} titles{active > 0 ? ` · ${active} in progress` : ''}</span>
      <span className="h-1 overflow-hidden rounded-full bg-(--surface-2)"><span className="block h-full bg-(--brass)" style={{ width: `${count === 0 ? 0 : (done / count) * 100}%` }} /></span>
    </Link>
  )
}

function ControllerLink(props: { listId: 'games'; items: MediaItem[]; count: number }) {
  const fine = useMediaQuery('(min-width: 768px) and (pointer: fine)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  if (!fine || reduced) return <PortraitCard {...props} />
  return (
    <div className="relative w-[340px] shrink-0">
      <svg aria-hidden="true" viewBox="0 0 340 520" className="pointer-events-none absolute inset-0 h-full w-full text-[#2a2748]">
        <path d="M70 180c-40 20-60 70-50 120 12 50 50 80 90 70 20-6 30 10 50 10h20c20 0 30-16 50-10 40 10 78-20 90-70 10-50-10-100-50-120-30-16-70-10-100 10-20 14-40 14-60 0-30-20-70-26-100-10z" fill="currentColor" opacity="0.35" />
      </svg>
      <PortraitCard {...props} />
    </div>
  )
}

export function MyListsPage() {
  const desktop = useMediaQuery('(min-width: 768px)')
  const { data, isLoading, error, refetch } = useLists()
  if (isLoading) return <main className="p-4"><Skeletons /></main>
  if (data === undefined) return <main className="p-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const counts = listCounts(data)
  const cards = ORDER.map((id) => id === 'games'
    ? <ControllerLink key={id} listId="games" items={data.lists.games} count={counts.games} />
    : <PortraitCard key={id} listId={id} items={data.lists[id]} count={counts[id]} />)
  return (
    <main className="relative min-h-[70vh] p-4">
      {desktop ? <Rail label="My lists">{cards}</Rail> : <div className="grid grid-cols-2 gap-4">{cards}</div>}
      <aside className={desktop ? 'fixed top-1/3 right-3 z-20 flex flex-col gap-3' : 'mt-6 flex gap-3'}>
        {(['other', 'curious'] as const).map((id) => (
          <Link key={id} to={`/lists/${id}`} className="flex min-h-14 min-w-11 items-center justify-center rounded-sm bg-(--accent)/80 px-2 py-3 text-center text-xs text-(--bg)">
            {TAB_NAME[id]}{counts[id] > 0 ? ` ${counts[id]}` : ''}
          </Link>
        ))}
      </aside>
    </main>
  )
}
