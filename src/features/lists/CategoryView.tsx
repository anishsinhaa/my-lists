import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PosterImage } from '@/components/common/PosterImage'
import { Rail } from '@/design/Rail'
import { StatusBadge } from '@/design/StatusBadge'
import { currentItems, thumbnailUrl, type ShelfGroup } from '@/design/archive'
import { statusLabel } from '@/design/statusConfig'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { FilterChrome } from './filters/FilterChrome'
import { SeriesSet } from './SeriesSet'
import type { ListQuery } from './filters/listQuery'
import { focusGroup, itemGroups } from './filters/itemGroups'
import { selectItems } from './filters/selectItems'
import { StatsStrip } from './StatsStrip'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from './useSaveItem'
import { ItemModal } from './views/ItemModal'
import { ListTable } from './views/ListTable'
import { PosterCard } from './views/PosterCard'


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

function GroupBlock({ group, listId, view, onOpen, onSeeAll }: {
  group: ShelfGroup
  listId: ListId
  view: ListQuery['view']
  onOpen: (item: MediaItem) => void
  onSeeAll: (() => void) | null
}) {
  const rail = view === 'shelves'
  const shown = rail ? group.items.slice(0, 30) : group.items
  const section = (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-['Cinzel',serif]">{statusLabel(listId, group.status)} · {group.total}</h2>
        {rail && onSeeAll !== null ? <button type="button" className="min-h-11 px-2 text-sm" onClick={onSeeAll}>See all</button> : null}
      </div>
      {group.flavour.length > 0 ? <p className="text-xs text-(--ink-muted)">{group.flavour}</p> : null}
      {view === 'table' ? <ListTable items={shown} listId={listId} onOpen={onOpen} /> : null}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AnimatePresence initial={false}>
            {shown.map((item, index) => (
              <motion.div key={item.id} className="min-w-0" exit={{ opacity: 0 }} initial={false} transition={{ duration: 0.22 }}>
                <PosterCard index={index} item={item} onOpen={onOpen} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      {rail ? (
        <Rail align={shown.length === 1 ? 'start' : 'center'} label={statusLabel(listId, group.status)}>
          <AnimatePresence initial={false}>
            {shown.map((item, index) => (
              <motion.div key={item.id} className="w-[clamp(9rem,22cqi,13.5rem)] shrink-0 snap-start" data-rail-card="true" exit={{ opacity: 0 }} initial={false} transition={{ duration: 0.22 }}>
                <PosterCard index={index} item={item} onOpen={onOpen} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Rail>
      ) : null}
    </section>
  )
  return rail ? <LazyBlock>{section}</LazyBlock> : section
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
  const [modalOrder, setModalOrder] = useState<string[] | null>(null)
  const [trackedItem, setTrackedItem] = useState(openItemId)
  if (openItemId !== trackedItem) {
    setTrackedItem(openItemId)
    if (openItemId !== null && openItemId.length > 0) setOpenId(openItemId)
  }
  const canEdit = useCanEdit()
  const save = useSaveItem()
  const source = shuffled ?? items
  const [now] = useState(() => new Date())
  const visible = useMemo(() => selectItems(listId, source, query, now), [listId, source, query, now])
  const current = useMemo(() => currentItems(listId, visible), [visible, listId])
  const groups = useMemo(() => itemGroups(listId, visible, query.group), [listId, query.group, visible])
  const open = openId === null ? null : items.find((item) => item.id === openId) ?? source.find((item) => item.id === openId) ?? null
  const modalItems = useMemo(() => {
    if (modalOrder === null) return visible
    const byId = new Map(items.map((item) => [item.id, item]))
    return modalOrder.flatMap((id) => {
      const found = byId.get(id)
      return found === undefined ? [] : [found]
    })
  }, [items, modalOrder, visible])

  function show(entry: MediaItem) {
    setOpenId(entry.id)
    setModalOrder((current) => {
      if (current !== null) return current
      const ids = visible.map((item) => item.id)
      if (!ids.includes(entry.id)) ids.push(entry.id)
      return ids
    })
  }

  function hide() {
    setOpenId(null)
    setModalOrder(null)
    onItemClose?.()
  }

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
      {query.view === 'shelves' && query.group === 'status' && listId !== 'series' && current.length > 0 ? (
        <section>
          <h2 className="mb-2 font-['Cinzel',serif]">Currently</h2>
          <Rail align={current.length === 1 ? 'start' : 'center'} label="Currently">
            {current.map((item) => (
              <button key={item.id} type="button" data-rail-card="true" className="w-[clamp(7.5rem,20cqi,11rem)] shrink-0 cursor-pointer snap-start text-left" onClick={() => show(item)}>
                <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
                <StatusBadge listId={item.listId} status={item.status} />
              </button>
            ))}
          </Rail>
        </section>
      ) : null}
      {visible.length === 0 ? <p className="p-8 text-center text-(--ink-muted)">The shelf is empty.</p> : null}
      {query.group === 'none' && query.view === 'table' ? <ListTable items={visible} listId={listId} onOpen={show} /> : null}
      {query.group === 'none' && query.view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <AnimatePresence initial={false}>
            {visible.map((item, index) => (
              <motion.div key={item.id} className="min-w-0" exit={{ opacity: 0 }} initial={false} transition={{ duration: 0.22 }}>
                <PosterCard index={index} item={item} onOpen={show} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
      {query.group === 'none' && query.view === 'shelves' ? (
        <Rail align={visible.length === 1 ? 'start' : 'center'} label="All">
          <AnimatePresence initial={false}>
            {visible.map((item, index) => (
              <motion.div key={item.id} className="w-[clamp(9rem,22cqi,13.5rem)] shrink-0 snap-start" data-rail-card="true" exit={{ opacity: 0 }} initial={false} transition={{ duration: 0.22 }}>
                <PosterCard index={index} item={item} onOpen={show} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Rail>
      ) : null}
      {query.group !== 'none' ? groups.map((group) => (
        <GroupBlock key={group.status} group={group} listId={listId} view={query.view} onOpen={show} onSeeAll={focusGroup(query.group, group.status, group.loose) === null ? null : () => { const next = focusGroup(query.group, group.status, group.loose); if (next !== null) patch(next) }} />
      )) : null}
      <ItemModal item={open} items={modalItems} listId={listId} readOnly={!canEdit} onClose={hide} onOpen={show} onSave={save} />
    </div>
  )
}
