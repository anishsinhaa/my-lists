import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Eraser, LayoutGrid, Rows3, SlidersHorizontal, Table2, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, shelfOrder } from '@/design/statusConfig'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { SMART_VIEWS } from '../smart/smartViews'
import { filterBadgeCount, viewIsCustom } from '../viewPrefs'
import { Choice } from './choice'
import { FiltersDrawer } from './FiltersDrawer'
import { ADDED_WITHIN_OPTIONS, type ListQuery } from './listQuery'

const COUNTS_FILTER = new Set<ListId>(['movies', 'series', 'anime', 'games'])
const VIEWS = [['shelves', Rows3, 'Shelves'], ['grid', LayoutGrid, 'Grid'], ['table', Table2, 'Table']] as const

function statusOn(listId: ListId, selected: string[], value: string): boolean {
  const canonical = matchStatus(listId, value).value
  return selected.some((status) => matchStatus(listId, status).value === canonical)
}

function toggleStatus(listId: ListId, query: ListQuery, value: string): string[] {
  const canonical = matchStatus(listId, value).value
  if (statusOn(listId, query.statuses, canonical)) return query.statuses.filter((status) => matchStatus(listId, status).value !== canonical)
  return [...query.statuses, canonical]
}

function StatusRow({ listId, items, query, onChange }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  onChange: (partial: Partial<ListQuery>) => void
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const key = matchStatus(listId, item.status).value
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [items, listId])
  const rows = useMemo(() => {
    const known = [...shelfOrder(listId)]
    const extra = [...counts.keys()].filter((key) => key !== 'No status' && !known.some((row) => row.value === key))
    const next = [...known, ...extra.map((value) => matchStatus(listId, value))]
    if ((counts.get('No status') ?? 0) > 0) next.push(matchStatus(listId, ''))
    return next
  }, [counts, listId])
  return (
    <div role="group" aria-label="Status" className="flex flex-nowrap gap-2 overflow-x-auto py-1 pb-1">
      <Choice listId={listId} pressed={query.statuses.length === 0} onClick={() => onChange({ statuses: [] })}>All</Choice>
      {rows.map((row) => (
        <Choice key={row.value} count={counts.get(row.value) ?? 0} icon={<StatusGlyph name={row.icon} />} listId={listId} pressed={statusOn(listId, query.statuses, row.value)} onClick={() => onChange({ statuses: toggleStatus(listId, query, row.value) })}>{row.value}</Choice>
      ))}
    </div>
  )
}

function ViewMenu({ view, custom, onChange }: { view: ListQuery['view']; custom: boolean; onChange: (partial: Partial<ListQuery>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = VIEWS.find(([value]) => value === view) ?? VIEWS[1]
  const Icon = current[1]
  useEffect(() => {
    if (!open) return undefined
    const stop = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (ref.current?.contains(target) === true || target.closest('[data-slot="dropdown-menu-content"]') !== null) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      if (event.type !== 'pointerdown') return
      const swallowClick = (click: Event) => {
        click.preventDefault()
        click.stopPropagation()
      }
      document.addEventListener('click', swallowClick, { capture: true, once: true })
    }
    document.addEventListener('pointerdown', stop, true)
    document.addEventListener('click', stop, true)
    return () => {
      document.removeEventListener('pointerdown', stop, true)
      document.removeEventListener('click', stop, true)
    }
  }, [open])
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div ref={ref} className="contents">
      <DropdownMenuTrigger aria-label={`${current[2]} view`} className="inline-flex h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 bg-(--surface) px-2.5 text-sm">
        <Icon aria-hidden="true" className="size-4" />
        <span className="hidden md:inline">{current[2]}</span>
        {custom ? <span aria-hidden="true" data-view-custom="true" className="size-2 rounded-full bg-accent" /> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-(--bg) text-(--ink)">
        {VIEWS.map(([value, ItemIcon, name]) => (
          <DropdownMenuItem key={value} className="min-h-11" onSelect={() => { if (view !== value) onChange({ view: value, group: value === 'shelves' ? 'status' : 'none' }) }}>
            <ItemIcon aria-hidden="true" className="size-4" />
            <span className="min-w-0 flex-1">{name}</span>
            {view === value ? <Check aria-hidden="true" className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      </div>
    </DropdownMenu>
  )
}

interface ActiveChip {
  key: string
  label: string
  clear: Partial<ListQuery>
}

function activeChips(listId: ListId, query: ListQuery): ActiveChip[] {
  const chips: ActiveChip[] = []
  if (query.q.length > 0) chips.push({ key: 'q', label: `Search: ${query.q}`, clear: { q: '' } })
  if (query.unrated) chips.push({ key: 'unrated', label: 'Unrated', clear: { unrated: false } })
  if (query.favWant) chips.push({ key: 'fav-want', label: 'Fav Want to', clear: { favWant: false } })
  if (query.favWatched) chips.push({ key: 'fav-watched', label: 'Fav Watched', clear: { favWatched: false } })
  for (const status of query.statuses) {
    const label = matchStatus(listId, status).value
    chips.push({
      key: `status-${label}`,
      label,
      clear: { statuses: query.statuses.filter((item) => matchStatus(listId, item).value !== label) },
    })
  }
  const added = ADDED_WITHIN_OPTIONS.find((option) => option.value === query.addedWithin)
  if (query.addedWithin !== 'any' && added !== undefined) chips.push({ key: 'added', label: added.label, clear: { addedWithin: 'any' } })
  for (const genre of query.genres) {
    chips.push({ key: `genre-${genre}`, label: genre, clear: { genres: query.genres.filter((item) => item !== genre) } })
  }
  if (query.smart !== null && query.smart.length > 0) {
    const view = SMART_VIEWS[listId].find((item) => item.id === query.smart)
    chips.push({ key: 'smart', label: view?.label ?? query.smart, clear: { smart: null } })
  }
  if (query.yearMin !== null || query.yearMax !== null) {
    const label = query.yearMin !== null && query.yearMax !== null ? `${query.yearMin}–${query.yearMax}` : query.yearMin !== null ? `From ${query.yearMin}` : `Until ${query.yearMax}`
    chips.push({ key: 'year', label, clear: { yearMin: null, yearMax: null } })
  }
  if (query.creator !== null && query.creator.length > 0) chips.push({ key: 'creator', label: query.creator, clear: { creator: null } })
  if (query.franchise !== null && query.franchise.length > 0) chips.push({ key: 'franchise', label: query.franchise, clear: { franchise: null } })
  if (query.platform !== null && query.platform.length > 0) chips.push({ key: 'platform', label: query.platform, clear: { platform: null } })
  if (query.ratingMin !== null) chips.push({ key: 'rating', label: `${query.ratingMin}+`, clear: { ratingMin: null } })
  if (query.poster !== 'any') chips.push({ key: 'poster', label: query.poster === 'has' ? 'Has poster' : 'Missing poster', clear: { poster: 'any' } })
  return chips
}

export function FilterChrome({ listId, items, query, shown, total, onChange, onShuffle }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  shown: number
  total: number
  onChange: (partial: Partial<ListQuery>) => void
  onShuffle?: () => void
}) {
  const [open, setOpen] = useState(false)
  const filtersRef = useRef<HTMLButtonElement>(null)
  const chips = activeChips(listId, query)
  const count = filterBadgeCount(query)
  const custom = viewIsCustom(query)
  const filtersLabel = count > 0 ? `Filters ${count}` : 'Filters'
  function setDrawer(next: boolean) {
    setOpen(next)
  }

  return (
    <div className="space-y-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input id="list-search" value={query.q} onChange={(event) => onChange({ q: event.target.value })} placeholder="Search this list" aria-label="Search this list" className="h-11 w-full min-w-0 flex-1 rounded-md border border-border bg-(--surface) px-3 sm:w-auto sm:min-w-40" />
        <button ref={filtersRef} type="button" aria-expanded={open} aria-haspopup="dialog" aria-label={filtersLabel} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 px-3 text-sm" onClick={() => setDrawer(true)}>
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {count > 0 ? <span className="tabular-nums">{count}</span> : null}
          {custom ? <span aria-hidden="true" data-view-custom="true" className="size-2 rounded-full bg-accent" /> : null}
        </button>
        <FiltersDrawer items={items} listId={listId} open={open} query={query} returnFocus={filtersRef} shown={shown} total={total} onChange={onChange} onOpenChange={setDrawer} />
        <ViewMenu custom={custom} view={query.view} onChange={onChange} />
        {onShuffle !== undefined ? <button type="button" className="h-11 px-3 text-sm" onClick={onShuffle}>Shuffle</button> : null}
      </div>
      {COUNTS_FILTER.has(listId) ? null : <StatusRow items={items} listId={listId} query={query} onChange={onChange} />}
      {chips.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button key={chip.key} type="button" aria-label={`Remove ${chip.label}`} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-(--brass)/50 bg-(--surface) pr-2 pl-3 text-sm md:min-h-8" onClick={() => onChange(chip.clear)}>
              <span>{chip.label}</span>
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ))}
          <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm md:min-h-8" onClick={() => onChange({ statuses: [], genres: [], smart: null, poster: 'any', q: '', yearMin: null, yearMax: null, ratingMin: null, creator: null, franchise: null, platform: null, addedWithin: 'any', unrated: false, favWant: false, favWatched: false })}>
            <Eraser aria-hidden="true" className="size-4" />
            Clear all
          </button>
          <p className="text-sm text-(--ink-muted) md:ml-auto">Showing {shown} of {total}</p>
        </div>
      )}
    </div>
  )
}
