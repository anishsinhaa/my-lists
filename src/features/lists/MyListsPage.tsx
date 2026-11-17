import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { Plaque } from '@/design/Plaque'
import { Rail } from '@/design/Rail'
import { thumbnailUrl } from '@/design/archive'
import { listCounts } from '@/features/data/selectors'
import { useLists } from '@/features/data/useLists'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TAB_NAME } from '@/types/lists'
import type { MediaItem } from '@/types/media'

const ORDER = ['movies', 'series', 'anime', 'games', 'books'] as const
type PortraitId = (typeof ORDER)[number]

function covers(items: MediaItem[]): MediaItem[] {
  return [...items].filter((item) => item.poster !== null).sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')).slice(0, 4)
}

function cellClass(count: number, index: number): string {
  if (count <= 1) return 'col-span-2 row-span-2'
  if (count === 2) return 'row-span-2'
  if (count === 3 && index === 2) return 'col-span-2'
  return ''
}

function tilt(event: PointerEvent<HTMLAnchorElement>) {
  if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const node = event.currentTarget
  const rect = node.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5
  const rest = node.dataset.list === 'games' ? -14 : 0
  node.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(rest + x * 8).toFixed(2)}deg)`
  node.style.setProperty('--gloss', `${((x + 0.5) * 100).toFixed(0)}%`)
}

function untilt(event: PointerEvent<HTMLAnchorElement>) {
  event.currentTarget.style.removeProperty('transform')
}

function ArchiveCard({ listId, items, count, active }: { listId: PortraitId; items: MediaItem[]; count: number; active?: boolean }) {
  const posters = covers(items)
  const inProgress = items.filter((item) => item.statusGroup === 'active').length
  const done = items.filter((item) => item.statusGroup === 'done').length
  return (
    <Link
      to={`/lists/${listId}`}
      data-list={listId}
      data-rail-card="true"
      data-carousel-card="true"
      data-active={active ? 'true' : 'false'}
      className="archive-card relative block aspect-2/3 w-[clamp(10.5rem,17cqi,16.5rem)] max-w-full shrink-0 snap-center overflow-hidden text-[#f6edd8] focus-visible:outline-2 focus-visible:outline-[#b08d57] max-md:w-[78%]"
      onPointerMove={tilt}
      onPointerLeave={untilt}
    >
      <span className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        {posters.length === 0 ? <span className={`col-span-2 row-span-2 ${listId === 'books' ? 'bg-[#6b3e2a]' : listId === 'anime' ? 'bg-[#fff4d6]' : listId === 'games' ? 'bg-[#100e21]' : listId === 'series' ? 'bg-[#2a1f1a]' : 'bg-[#14110e]'}`} /> : posters.map((item, index) => (
          <img key={item.id} alt="" className={`h-full min-h-0 w-full object-cover ${cellClass(posters.length, index)}`} decoding="async" loading="lazy" src={thumbnailUrl(item.poster, 'w342') ?? ''} />
        ))}
      </span>
      <span aria-hidden="true" className={`archive-skin archive-skin-${listId}`} />
      <span aria-hidden="true" className="archive-gloss" />
      <span className="absolute top-[8%] right-[10%] left-[12%] z-10">
        <Plaque>{TAB_NAME[listId]}</Plaque>
      </span>
      <span className="absolute inset-x-0 bottom-0 z-10 bg-black/80 px-3 py-2 text-[#f6edd8]">
        <span className="block text-xs">{count} titles{inProgress > 0 ? ` · ${inProgress} in progress` : ''}</span>
        <span className="mt-1 block h-1 bg-white/25"><span className="block h-full bg-[#d4af37]" style={{ width: `${count === 0 ? 0 : (done / count) * 100}%` }} /></span>
      </span>
    </Link>
  )
}

function Seal({ id, count }: { id: 'other' | 'curious'; count: number }) {
  return (
    <Link to={`/lists/${id}`} className="flex size-14 flex-col items-center justify-center rounded-full border-2 border-[#b08d57] bg-[#5c241c] text-center text-[10px] leading-tight text-[#f6edd8] shadow-[inset_0_2px_0_#ffffff33,0_8px_16px_#00000066]">
      <span>{TAB_NAME[id]}</span>
      {count > 0 ? <span className="tabular-nums">{count}</span> : null}
    </Link>
  )
}

export function MyListsPage() {
  const desktop = useMediaQuery('(min-width: 768px)')
  const carousel = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const { data, isLoading, error, refetch } = useLists()

  useEffect(() => {
    if (desktop) return undefined
    const root = carousel.current
    if (root === null) return undefined
    const cards = [...root.querySelectorAll('[data-carousel-card]')]
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      if (hit === undefined) return
      const index = cards.indexOf(hit.target)
      if (index >= 0) setActive(index)
    }, { root, threshold: [0.55, 0.75] })
    for (const card of cards) observer.observe(card)
    return () => observer.disconnect()
  }, [desktop, data])

  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const counts = listCounts(data)
  const cards = (mobileActive: boolean) => ORDER.map((id, index) => (
    <ArchiveCard key={id} active={mobileActive && index === active} count={counts[id]} items={data.lists[id]} listId={id} />
  ))
  return (
    <main className="edge relative w-full max-w-full overflow-x-clip py-4 md:min-h-[70vh]">
      {desktop ? (
        <div className="flex items-center gap-[clamp(0.75rem,2vw,1.5rem)]">
          <div className="min-w-0 flex-1">
            <Rail label="My lists">{cards(false)}</Rail>
          </div>
          <aside className="flex shrink-0 flex-col gap-3">
            <Seal count={counts.other} id="other" />
            <Seal count={counts.curious} id="curious" />
          </aside>
        </div>
      ) : (
        <>
          <div ref={carousel} className="list-carousel">
            {cards(true)}
          </div>
          <aside className="mt-4 flex items-center justify-center gap-4">
            <Seal count={counts.other} id="other" />
            <Seal count={counts.curious} id="curious" />
          </aside>
        </>
      )}
    </main>
  )
}
