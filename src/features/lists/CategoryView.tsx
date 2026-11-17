import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownUp, LayoutGrid, Rows3, SlidersHorizontal, Table2 } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { IconButton } from '@/design/IconButton'
import { Rail } from '@/design/Rail'
import { SegmentedBar } from '@/design/Stat'
import { StatusBadge } from '@/design/StatusBadge'
import { currentItems, shelfGroups, thumbnailUrl } from '@/design/archive'
import { shelfOrder } from '@/design/statusConfig'
import { applyListQuery } from '@/features/lists/filters/applyListQuery'
import type { ListQuery } from '@/features/lists/filters/listQuery'
import { SMART_VIEWS } from '@/features/lists/smart/smartViews'
import { computeStats } from '@/features/lists/stats/computeStats'
import { externalRatingLabel } from '@/lib/rating'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { PosterCard } from './views/PosterCard'
import { ListTable } from './views/ListTable'
import { DetailSheet } from './views/DetailSheet'

const KEPT_VIEWS = new Set(['nolan', 'marvel', 'top-rated', 'recent'])
const QUERY_NOW = new Date('2026-01-01T00:00:00.000Z')

function LazyBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (node === null) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setShow(true)
    }, { rootMargin: '240px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref}>{show ? children : <div className="h-72" />}</div>
}

export function CategoryView({ listId, items, query, onChange }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  onChange: (next: ListQuery) => void
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [shuffled, setShuffled] = useState<MediaItem[] | null>(null)
  const [open, setOpen] = useState<MediaItem | null>(null)
  const source = shuffled ?? items
  const visible = useMemo(() => applyListQuery(source, query, { now: QUERY_NOW }), [source, query])
  const stats = useMemo(() => computeStats(items), [items])
  const current = useMemo(() => currentItems(listId, items), [items, listId])
  const groups = useMemo(() => shelfGroups(listId, visible), [visible, listId])
  const views = SMART_VIEWS[listId].filter((view) => KEPT_VIEWS.has(view.id))
  const label = externalRatingLabel(listId)

  useEffect(() => {
    const onAsk = () => document.getElementById('list-search')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        document.getElementById('list-search')?.focus()
      }
    }
    window.addEventListener('ml:search', onAsk)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('ml:search', onAsk)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function patch(partial: Partial<ListQuery>) {
    onChange({ ...query, ...partial })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-(--brass)/40 bg-(--surface) p-4">
        <p className="font-['Cinzel',serif] text-4xl tabular-nums">{stats.total}</p>
        <SegmentedBar
          segments={Object.entries(stats.byStatus).filter(([, count]) => count > 0).map(([status, count]) => ({ id: status, label: status, count }))}
          onSelect={(status) => patch({ statuses: [status] })}
        />
        <p className="mt-2 text-sm text-(--ink-muted)">
          {stats.avgMyRating === null ? '' : `My average ${stats.avgMyRating}`}
          {stats.avgExternalRating === null ? '' : `${stats.avgMyRating === null ? '' : ' · '}${label} ${stats.avgExternalRating}`}
          {stats.topGenres.length === 0 ? '' : ` · ${stats.topGenres.map((genre) => genre.genre).join(', ')}`}
        </p>
      </section>
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-md bg-(--bg)/90 p-2 backdrop-blur">
        <input id="list-search" value={query.q} onChange={(event) => patch({ q: event.target.value })} placeholder="Search this list" aria-label="Search this list" className="h-11 min-w-40 flex-1 rounded-md border border-border bg-(--surface) px-3" />
        <IconButton label="Filters" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal className="size-4" /></IconButton>
        <IconButton label="Sort" onClick={() => patch({ sort: query.sort === 'title' ? 'updated' : query.sort === 'updated' ? 'year' : query.sort === 'year' ? 'myRating' : 'title' })}><ArrowDownUp className="size-4" /></IconButton>
        <div role="radiogroup" aria-label="View" className="flex gap-1">
          {([['shelves', Rows3, 'Shelves'], ['grid', LayoutGrid, 'Grid'], ['table', Table2, 'Table']] as const).map(([value, Icon, name]) => (
            <IconButton key={value} label={name} onClick={() => patch({ view: value })}><Icon className="size-4" /></IconButton>
          ))}
        </div>
        {query.view === 'grid' ? <button type="button" className="h-11 px-3 text-sm" onClick={() => setShuffled([...items].sort(() => Math.random() - 0.5))}>Shuffle</button> : null}
      </div>
      {filtersOpen ? (
        <div className="space-y-3 rounded-md border border-border bg-(--surface) p-4">
          <div className="flex flex-wrap gap-2">
            {shelfOrder(listId).map((row) => (
              <button key={row.value} type="button" aria-pressed={query.statuses.includes(row.value)} className="min-h-11 rounded-full border border-border px-3 text-sm" onClick={() => patch({ statuses: query.statuses.includes(row.value) ? query.statuses.filter((status) => status !== row.value) : [...query.statuses, row.value] })}>
                {row.value}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {views.map((view) => (
              <button key={view.id} type="button" className="min-h-11 rounded-full border border-(--brass) px-3 text-sm" onClick={() => patch({ smart: query.smart === view.id ? null : view.id })}>{view.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 px-3 text-sm" onClick={() => patch({ poster: 'has' })}>Has poster</button>
            <button type="button" className="min-h-11 px-3 text-sm" onClick={() => patch({ poster: 'missing' })}>Missing poster</button>
            <button type="button" className="min-h-11 px-3 text-sm" onClick={() => patch({ statuses: [], genres: [], smart: null, poster: 'any', q: '', yearMin: null, yearMax: null, ratingMin: null, creator: null, franchise: null })}>Clear all</button>
          </div>
        </div>
      ) : null}
      {current.length === 0 ? null : (
        <section className={listId === 'series' ? 'scanlines rounded-md border-8 border-[#3a2c24] p-2' : ''}>
          <h2 className="mb-2 font-['Cinzel',serif]">Currently</h2>
          <Rail label="Currently">
            {current.map((item) => (
              <button key={item.id} type="button" data-rail-card="true" className="w-40 shrink-0 snap-start text-left" onClick={() => setOpen(item)}>
                <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w342')} title={item.title} />
                <StatusBadge listId={item.listId} status={item.status} />
              </button>
            ))}
          </Rail>
        </section>
      )}
      {visible.length === 0 ? <p className="p-8 text-center text-(--ink-muted)">The shelf is empty.</p> : null}
      {query.view === 'table' ? <ListTable items={visible} listId={listId} /> : null}
      {query.view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((item, index) => <PosterCard key={item.id} index={index} item={item} onOpen={setOpen} />)}
        </div>
      ) : null}
      {query.view === 'shelves' ? groups.map((group) => (
        <LazyBlock key={group.status}>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-['Cinzel',serif]">{group.status} · {group.total}</h2>
              <button type="button" className="min-h-11 px-2 text-sm" onClick={() => patch({ statuses: [group.status], view: 'grid' })}>See all</button>
            </div>
            <p className="text-xs text-(--ink-muted)">{group.flavour}</p>
            <Rail label={group.status}>
              {group.items.map((item, index) => (
                <div key={item.id} data-rail-card="true" className="w-52 shrink-0 snap-start">
                  <PosterCard index={index} item={item} onOpen={setOpen} />
                </div>
              ))}
            </Rail>
          </section>
        </LazyBlock>
      )) : null}
      <DetailSheet item={open} listId={listId} onClose={() => setOpen(null)} />
    </div>
  )
}
