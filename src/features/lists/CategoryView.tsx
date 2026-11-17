import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PosterImage } from '@/components/common/PosterImage'
import { Rail } from '@/design/Rail'
import { StatusBadge } from '@/design/StatusBadge'
import { currentItems, shelfGroups, thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { FilterChrome } from './filters/FilterChrome'
import { SeriesSet } from './SeriesSet'
import type { ListQuery } from './filters/listQuery'
import { selectItems } from './filters/selectItems'
import { StatsStrip } from './StatsStrip'
import { useSaveItem } from './useSaveItem'
import { ItemModal } from './views/ItemModal'
import { ListTable } from './views/ListTable'
import { PosterCard } from './views/PosterCard'

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

export function CategoryView({ listId, items, query, onChange, enriching, openItemId = null, onItemClose }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  onChange: (next: ListQuery) => void
  enriching?: string
  openItemId?: string | null
  onItemClose?: () => void
}) {
  const [shuffled, setShuffled] = useState<MediaItem[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(openItemId)
  const [trackedItem, setTrackedItem] = useState(openItemId)
  if (openItemId !== trackedItem) {
    setTrackedItem(openItemId)
    if (openItemId !== null && openItemId.length > 0) setOpenId(openItemId)
  }
  const save = useSaveItem()
  const source = shuffled ?? items
  const visible = useMemo(() => selectItems(listId, source, query, QUERY_NOW), [listId, source, query])
  const current = useMemo(() => currentItems(listId, visible), [visible, listId])
  const groups = useMemo(() => shelfGroups(listId, visible, query.smart === 'top-rated' ? 'given' : 'rating'), [visible, listId, query.smart])

  const open = openId === null ? null : items.find((item) => item.id === openId) ?? source.find((item) => item.id === openId) ?? null

  function patch(partial: Partial<ListQuery>) {
    onChange({ ...query, ...partial })
  }

  return (
    <div className="space-y-4">
      {listId === 'series'
        ? <SeriesSet items={items} note={enriching} query={query} onChange={patch} />
        : <StatsStrip items={items} listId={listId} query={query} onChange={patch} />}
      <FilterChrome
        items={items}
        listId={listId}
        query={query}
        shown={visible.length}
        total={items.length}
        onChange={patch}
        onShuffle={query.view === 'grid' ? () => setShuffled([...items].sort(() => Math.random() - 0.5)) : undefined}
      />
      {query.view === 'shelves' && listId !== 'series' && current.length > 0 ? (
        <section>
          <h2 className="mb-2 font-['Cinzel',serif]">Currently</h2>
          <Rail align={current.length === 1 ? 'start' : 'center'} label="Currently">
            {current.map((item) => (
              <button key={item.id} type="button" data-rail-card="true" className="w-[clamp(7.5rem,20cqi,11rem)] shrink-0 snap-start text-left" onClick={() => setOpenId(item.id)}>
                <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
                <StatusBadge listId={item.listId} status={item.status} />
              </button>
            ))}
          </Rail>
        </section>
      ) : null}
      {visible.length === 0 ? <p className="p-8 text-center text-(--ink-muted)">The shelf is empty.</p> : null}
      {query.view === 'table' ? <ListTable items={visible} listId={listId} onOpen={(item) => setOpenId(item.id)} /> : null}
      {query.view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((item, index) => <PosterCard key={item.id} index={index} item={item} onOpen={(entry) => setOpenId(entry.id)} />)}
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
            <Rail align={group.items.length === 1 ? 'start' : 'center'} label={group.status}>
              {group.items.map((item, index) => (
                <div key={item.id} data-rail-card="true" className="w-[clamp(9rem,22cqi,13.5rem)] shrink-0 snap-start">
                  <PosterCard index={index} item={item} onOpen={(entry) => setOpenId(entry.id)} />
                </div>
              ))}
            </Rail>
          </section>
        </LazyBlock>
      )) : null}
      <ItemModal item={open} items={visible} listId={listId} onClose={() => { setOpenId(null); onItemClose?.() }} onOpen={(entry) => setOpenId(entry.id)} onSave={save} />
    </div>
  )
}
