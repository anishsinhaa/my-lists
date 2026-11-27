import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import curiousSeal from '@/assets/wax-seal-curious.png'
import otherSeal from '@/assets/wax-seal-other.png'
import { ErrorState } from '@/components/common/ErrorState'
import { PosterSkeletons } from '@/components/common/PosterSkeletons'
import { Rail } from '@/design/Rail'
import { ListSign } from '@/features/lists/ListSign'
import { thumbnailUrl } from '@/design/archive'
import { listCounts } from '@/features/data/selectors'
import { useLists } from '@/features/data/useLists'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TAB_NAME } from '@/types/lists'
import type { MediaItem } from '@/types/media'

const ORDER = ['movies', 'series', 'anime', 'games', 'books'] as const
type PortraitId = (typeof ORDER)[number]
const SEAL: Record<'other' | 'curious', string> = { other: otherSeal, curious: curiousSeal }

function covers(items: MediaItem[]): MediaItem[] {
  return items.filter((item) => item.poster !== null).slice(0, 4)
}

function cellClass(count: number, index: number): string {
  if (count <= 1) return 'col-span-2 row-span-2'
  if (count === 2) return 'row-span-2'
  if (count === 3 && index === 2) return 'col-span-2'
  return ''
}

function tilt(event: PointerEvent<HTMLSpanElement>) {
  if (event.pointerType !== 'mouse') return
  const node = event.currentTarget
  const rect = node.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5
  const rest = node.dataset.list === 'games' ? -14 : 0
  node.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(rest + x * 8).toFixed(2)}deg)`
  node.style.setProperty('--gloss', `${((x + 0.5) * 100).toFixed(0)}%`)
}

function untilt(event: PointerEvent<HTMLSpanElement>) {
  event.currentTarget.style.removeProperty('transform')
}

function ArchiveCard({ listId, items, count, active }: { listId: PortraitId; items: MediaItem[]; count: number; active?: boolean }) {
  const posters = covers(items)
  const inProgress = items.filter((item) => item.statusGroup === 'active').length
  const done = items.filter((item) => item.statusGroup === 'done').length
  return (
    <Link
      to={`/lists/${listId}`}
      data-rail-card="true"
      data-carousel-card="true"
      data-active={active ? 'true' : 'false'}
      className="archive-slot flex shrink-0 snap-center flex-col items-center gap-2 text-[#f6edd8] focus-visible:outline-2 focus-visible:outline-[#b08d57]"
    >
      <span className="archive-face">
        <ListSign listId={listId}>{TAB_NAME[listId]}</ListSign>
        <span
          data-list={listId}
          className="archive-card relative block aspect-2/3 w-full overflow-hidden"
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
        </span>
      </span>
      <span className="w-full text-center text-sm">
        <span className="block">{count} titles{inProgress > 0 ? ` · ${inProgress} in progress` : ''}</span>
        <span className="mt-1 block h-1 bg-white/20"><span className="block h-full bg-[#d4af37]" style={{ width: `${count === 0 ? 0 : (done / count) * 100}%` }} /></span>
      </span>
    </Link>
  )
}

function Seal({ id, count }: { id: 'other' | 'curious'; count: number }) {
  return (
    <Link to={`/lists/${id}`} className="flex min-h-11 items-center gap-2 rounded-[12px] border border-[#b08d57]/35 bg-[#5c241c]/45 px-3 text-sm text-[#f6edd8]/75 shadow-none transition hover:border-[#b08d57] hover:bg-[#5c241c] hover:text-[#f6edd8]">
      <img alt="" className="size-7 shrink-0" src={SEAL[id]} />
      <span>{TAB_NAME[id]}</span>
      <span className="tabular-nums">{count}</span>
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

  if (isLoading) return <main className="edge py-4"><PosterSkeletons /></main>
  if (data === undefined) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>
  const counts = listCounts(data)
  const cards = (mobileActive: boolean) => ORDER.map((id, index) => (
    <ArchiveCard key={id} active={mobileActive && index === active} count={counts[id]} items={data.lists[id]} listId={id} />
  ))
  return (
    <main className="edge flex w-full max-w-full flex-col justify-center overflow-x-clip py-4 max-md:pb-24 md:min-h-[calc(100dvh-9.25rem)]">
      {desktop ? <Rail label="My lists">{cards(false)}</Rail> : (
        <div ref={carousel} className="list-carousel">
          {cards(true)}
        </div>
      )}
      <aside className="fixed right-[clamp(0.75rem,2vw,1.5rem)] bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap justify-end gap-2 md:bottom-14">
        <Seal count={counts.other} id="other" />
        <Seal count={counts.curious} id="curious" />
      </aside>
    </main>
  )
}
