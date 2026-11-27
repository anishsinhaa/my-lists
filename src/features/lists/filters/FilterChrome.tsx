import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { ArrowDownUp, Calendar, Check, Eraser, Gamepad2, Group, Layers, LayoutGrid, Rows3, SlidersHorizontal, Sparkles, Star, Table2, Tags, UserRound, X } from 'lucide-react'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, shelfOrder } from '@/design/statusConfig'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { groupOptions } from '../groupOptions'
import { hasFinishedColumn, sortChipLabel, sortOptions } from '../sortOptions'
import { finishedOn, SMART_VIEWS } from '../smart/smartViews'
import { clearFiltersPatch, filterBadgeCount, resetViewPatch, viewIsCustom } from '../viewPrefs'
import { FILTER_CONFIG } from './filterConfig'
import { type ListQuery, type RatingBy } from './listQuery'

const KEPT_VIEWS = new Set(['nolan', 'marvel', 'top-rated', 'recent'])
const CHIP_LIMIT = 12

const SHAPE: Record<ListId, string> = {
  movies: 'rounded-[2px_14px_2px_14px] border-dashed',
  series: 'rounded-md font-(--font-body)',
  anime: 'rounded-md border-[3px] shadow-[3px_3px_0_#1b1b3a]',
  games: "rounded-sm font-['Rajdhani',sans-serif] tracking-wider uppercase",
  books: 'rounded-sm border-l-4',
  other: 'rounded-md',
  curious: 'rounded-md',
}

const EDGE: Record<ListId, string> = {
  movies: 'border-[#d4af37]',
  series: 'border-[#6e8f8a]',
  anime: 'border-[#1b1b3a]',
  games: 'border-[#00f0ff]',
  books: 'border-[#8c5a3c]',
  other: 'border-[#5eead4]/40',
  curious: 'border-[#b08d57]/50',
}

function chipClass(listId: ListId, pressed: boolean, slim = false): string {
  const height = slim ? 'min-h-8 px-2 text-xs' : 'min-h-11 px-3 text-sm'
  const state = pressed ? 'border-transparent bg-accent text-(--bg)' : `bg-(--surface) text-(--ink) ${EDGE[listId]}`
  return `inline-flex shrink-0 items-center gap-1.5 border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brass) ${height} ${SHAPE[listId]} ${state}`
}

function frequent(values: Array<string | null>): string[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value === null || value.length === 0) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([value]) => value)
}

function Choice({ listId, pressed, onClick, children, count, icon, slim = false }: {
  listId: ListId
  pressed: boolean
  onClick: () => void
  children: string
  count?: number
  icon?: ReactNode
  slim?: boolean
}) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={count === undefined ? children : `${children} ${count}`} onClick={onClick} className={chipClass(listId, pressed, slim)}>
      {pressed ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
      {icon}
      <span>{children}</span>
      {count === undefined || slim ? null : <span className="tabular-nums">{count}</span>}
    </button>
  )
}

const COUNTS_FILTER = new Set<ListId>(['movies', 'series', 'anime', 'games'])

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

function ChipWrap({ values, children }: { values: string[]; children: (shown: string[]) => ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? values : values.slice(0, CHIP_LIMIT)
  return (
    <div className="space-y-2">
      {children(shown)}
      {values.length > CHIP_LIMIT && !expanded ? (
        <button type="button" className="min-h-11 text-sm underline" onClick={() => setExpanded(true)}>Show all ({values.length})</button>
      ) : null}
    </div>
  )
}

function FilterSwitch({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm" onClick={onClick}>
      <span>{label}</span>
      <span className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 ${pressed ? 'justify-end border-transparent bg-accent' : 'border-(--brass)/40 bg-(--surface)'}`}>
        <span className="size-5 rounded-full bg-(--bg)" />
      </span>
    </button>
  )
}

function yearValue(raw: string): number | null {
  if (raw.trim().length === 0) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const VIEWS = [['shelves', Rows3, 'Shelves'], ['grid', LayoutGrid, 'Grid'], ['table', Table2, 'Table']] as const

function ViewMenu({ view, custom, onChange }: { view: ListQuery['view']; custom: boolean; onChange: (partial: Partial<ListQuery>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, ref)
  const current = VIEWS.find(([value]) => value === view) ?? VIEWS[1]
  const Icon = current[1]
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-label={`${current[2]} view`} className="inline-flex h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 bg-(--surface) px-2.5 text-sm" onClick={() => setOpen((value) => !value)}>
        <Icon aria-hidden="true" className="size-4" />
        <span className="hidden md:inline">{current[2]}</span>
        {custom ? <span aria-hidden="true" data-view-custom="true" className="size-2 rounded-full bg-accent" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 min-w-40 rounded-md border border-(--brass)/40 bg-(--bg) p-1 shadow-xl">
          {VIEWS.map(([value, ItemIcon, name]) => {
            const on = view === value
            return (
              <button key={value} type="button" aria-pressed={on} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm aria-pressed:bg-(--accent) aria-pressed:text-(--bg)" onClick={() => { setOpen(false); if (!on) onChange({ view: value, group: value === 'shelves' ? 'status' : 'none' }) }}>
                <ItemIcon aria-hidden="true" className="size-4" />
                <span className="min-w-0 flex-1">{name}</span>
                {on ? <Check aria-hidden="true" className="size-4" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
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

function useFocusTrap(open: boolean, node: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return undefined
    const root = node.current
    if (root === null) return undefined
    const focusable = () => [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('disabled'))
    focusable()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (first === undefined || last === undefined) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [node, open])
}

function PanelBody({ listId, items, query, onChange }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  onChange: (partial: Partial<ListQuery>) => void
}) {
  const config = FILTER_CONFIG[listId]
  const genres = useMemo(() => frequent(items.flatMap((item) => item.genres)), [items])
  const creators = useMemo(() => frequent(items.map((item) => item.creator)), [items])
  const franchises = useMemo(() => frequent(items.map((item) => item.franchise)), [items])
  const platforms = useMemo(() => frequent(items.map((item) => item.platform)), [items])
  const views = SMART_VIEWS[listId].filter((view) => {
    if (!KEPT_VIEWS.has(view.id)) return false
    if (view.id !== 'recent') return true
    return items.some((item) => finishedOn(item) !== null)
  })
  const label = externalRatingLabel(listId)
  const sorts = sortOptions(listId, hasFinishedColumn(listId, items))
  const groups = groupOptions(listId, items)
  const count = filterBadgeCount(query)
  const viewDefault = !viewIsCustom(query)
  const heading = count > 0 ? `Filters · ${count}` : 'Filters'
  return (
    <>
      <div className="grid min-h-0 flex-1 md:grid-cols-[340px_minmax(0,1fr)]">
        <section aria-labelledby="list-view-heading" className="space-y-4 border-b border-(--border) p-4 md:border-r md:border-b-0 md:p-5">
          <div className="space-y-1">
            <h2 id="list-view-heading" className="flex items-center gap-2 font-(--font-display) text-xl">
              <LayoutGrid aria-hidden="true" className="size-5" />
              View
            </h2>
            <p className="text-sm text-(--ink-muted)">How the list looks</p>
          </div>
          <div role="radiogroup" aria-label="Layout" className="flex flex-wrap gap-2">
            {VIEWS.map(([value, Icon, name]) => (
              <button key={value} type="button" aria-pressed={query.view === value} className={chipClass(listId, query.view === value)} onClick={() => onChange(query.view === value ? {} : { view: value, group: value === 'shelves' ? 'status' : 'none' })}>
                {query.view === value ? <Check aria-hidden="true" className="size-3.5" /> : null}
                <Icon aria-hidden="true" className="size-4" />
                {name}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium"><ArrowDownUp aria-hidden="true" className="size-4" /> Sort by</h3>
              <button type="button" aria-label={query.dir === 'asc' ? 'Sort ascending' : 'Sort descending'} className="min-h-11 px-2 text-sm text-(--ink-muted)" onClick={() => onChange({ dir: query.dir === 'asc' ? 'desc' : 'asc' })}>
                {query.dir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
            <div role="radiogroup" aria-label="Sort by" className="flex flex-wrap gap-3">
              {sorts.map((option) => {
                const selected = query.sort === option.key
                return (
                  <Choice key={option.key} listId={listId} pressed={selected} onClick={() => onChange(selected ? { dir: query.dir === 'asc' ? 'desc' : 'asc' } : { sort: option.key, dir: option.dir })}>
                    {sortChipLabel(option, selected, query.dir)}
                  </Choice>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium"><Group aria-hidden="true" className="size-4" /> Group by</h3>
            <div role="radiogroup" aria-label="Group by" className="flex flex-wrap gap-3">
              {groups.map((option) => (
                <Choice key={option.key} listId={listId} pressed={query.group === option.key} onClick={() => onChange(option.key === 'none' && query.view === 'shelves' ? { group: 'none', view: 'grid' } : { group: option.key })}>
                  {option.label}
                </Choice>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Toggles" className="space-y-1">
            <FilterSwitch label="Unrated" pressed={query.unrated} onClick={() => onChange({ unrated: !query.unrated })} />
            <FilterSwitch label="Fav Want to" pressed={query.favWant} onClick={() => onChange({ favWant: !query.favWant })} />
            <FilterSwitch label="Fav Watched" pressed={query.favWatched} onClick={() => onChange({ favWatched: !query.favWatched })} />
          </div>
          <button type="button" className="min-h-11 text-sm text-(--ink-muted) disabled:opacity-40" disabled={viewDefault} onClick={() => onChange(resetViewPatch())}>Reset view</button>
        </section>
        <section aria-labelledby="list-filters-heading" className="space-y-4 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id="list-filters-heading" className="flex items-center gap-2 font-(--font-display) text-xl">
                <SlidersHorizontal aria-hidden="true" className="size-5" />
                {heading}
              </h2>
              <p className="text-sm text-(--ink-muted)">Narrow down what's shown</p>
            </div>
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-(--ink-muted) disabled:opacity-40" disabled={count === 0} onClick={() => onChange(clearFiltersPatch())}>
              <X aria-hidden="true" className="size-3.5" />
              Clear filters
            </button>
          </div>
          <div className="grid gap-4 min-[1100px]:grid-cols-2">
            {config.show.genre && genres.length > 0 ? (
              <GroupBlock icon={<Tags className="size-4" aria-hidden="true" />} title="Genre">
                <ChipWrap values={genres}>
                  {(shown) => (
                    <div className="flex flex-wrap gap-3">
                      {shown.map((genre) => (
                        <Choice key={genre} listId={listId} pressed={query.genres.includes(genre)} onClick={() => onChange({ genres: query.genres.includes(genre) ? query.genres.filter((value) => value !== genre) : [...query.genres, genre] })}>{genre}</Choice>
                      ))}
                    </div>
                  )}
                </ChipWrap>
              </GroupBlock>
            ) : null}
            {config.show.year ? (
              <GroupBlock icon={<Calendar className="size-4" aria-hidden="true" />} title="Year">
                <div className="flex gap-3">
                  <label className="text-sm">From
                    <input aria-label="From year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMin ?? ''} onChange={(event) => onChange({ yearMin: yearValue(event.target.value) })} />
                  </label>
                  <label className="text-sm">Until
                    <input aria-label="Until year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMax ?? ''} onChange={(event) => onChange({ yearMax: yearValue(event.target.value) })} />
                  </label>
                </div>
              </GroupBlock>
            ) : null}
            {config.show.creator && creators.length > 0 ? (
              <GroupBlock icon={<UserRound className="size-4" aria-hidden="true" />} title={config.creatorLabel}>
                <ChipWrap values={creators}>
                  {(shown) => (
                    <div className="flex flex-wrap gap-3">
                      {shown.map((creator) => (
                        <Choice key={creator} listId={listId} pressed={query.creator === creator} onClick={() => onChange({ creator: query.creator === creator ? null : creator })}>{creator}</Choice>
                      ))}
                    </div>
                  )}
                </ChipWrap>
              </GroupBlock>
            ) : null}
            {config.show.franchise && franchises.length > 0 ? (
              <GroupBlock icon={<Layers className="size-4" aria-hidden="true" />} title={config.franchiseLabel}>
                <ChipWrap values={franchises}>
                  {(shown) => (
                    <div className="flex flex-wrap gap-3">
                      {shown.map((franchise) => (
                        <Choice key={franchise} listId={listId} pressed={query.franchise === franchise} onClick={() => onChange({ franchise: query.franchise === franchise ? null : franchise })}>{franchise}</Choice>
                      ))}
                    </div>
                  )}
                </ChipWrap>
              </GroupBlock>
            ) : null}
            {config.show.platform && platforms.length > 0 ? (
              <GroupBlock icon={<Gamepad2 className="size-4" aria-hidden="true" />} title="Platform">
                <ChipWrap values={platforms}>
                  {(shown) => (
                    <div className="flex flex-wrap gap-3">
                      {shown.map((platform) => (
                        <Choice key={platform} listId={listId} pressed={query.platform === platform} onClick={() => onChange({ platform: query.platform === platform ? null : platform })}>{platform}</Choice>
                      ))}
                    </div>
                  )}
                </ChipWrap>
              </GroupBlock>
            ) : null}
            {config.show.rating ? (
              <GroupBlock icon={<Star className="size-4" aria-hidden="true" />} title="Rating">
                <div className="flex flex-wrap gap-3">
                  {[6, 7, 8, 9].map((min) => (
                    <Choice key={min} listId={listId} pressed={query.ratingMin === min} onClick={() => onChange({ ratingMin: query.ratingMin === min ? null : min })}>{`${min}+`}</Choice>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {([['best', 'Best'], ['my', 'Mine'], ['external', label]] as const).map(([value, name]) => (
                    <Choice key={value} listId={listId} pressed={query.ratingBy === value} onClick={() => onChange({ ratingBy: value as RatingBy })}>{name}</Choice>
                  ))}
                </div>
              </GroupBlock>
            ) : null}
            {views.length > 0 ? (
              <GroupBlock icon={<Sparkles className="size-4" aria-hidden="true" />} title="Smart views">
                <div className="flex flex-wrap gap-3">
                  {views.map((view) => (
                    <Choice key={view.id} listId={listId} pressed={query.smart === view.id} onClick={() => onChange({ smart: query.smart === view.id ? null : view.id })}>{view.label}</Choice>
                  ))}
                </div>
              </GroupBlock>
            ) : null}
            <GroupBlock icon={<LayoutGrid className="size-4" aria-hidden="true" />} title="Poster">
              <div className="flex flex-wrap gap-3">
                {([['any', 'Any'], ['has', 'Has poster'], ['missing', 'Missing poster']] as const).map(([value, name]) => (
                  <Choice key={value} listId={listId} pressed={query.poster === value} onClick={() => onChange({ poster: value })}>{name}</Choice>
                ))}
              </div>
            </GroupBlock>
          </div>
        </section>
      </div>
    </>
  )
}

function GroupBlock({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">{icon}{title}</h3>
      {children}
    </div>
  )
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
  const anchorRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, anchorRef)
  useFocusTrap(open, dialogRef)
  const chips = activeChips(listId, query)
  const count = filterBadgeCount(query)
  const custom = viewIsCustom(query)
  const statusRow = !COUNTS_FILTER.has(listId)
  const filtersLabel = count > 0 ? `Filters ${count}` : 'Filters'

  return (
    <div className="filter-sticky space-y-2 bg-(--bg)/90 py-2 backdrop-blur">
      <div className="relative flex flex-wrap items-center gap-2">
        <input id="list-search" value={query.q} onChange={(event) => onChange({ q: event.target.value })} placeholder="Search this list" aria-label="Search this list" className="h-11 w-full min-w-0 flex-1 rounded-md border border-border bg-(--surface) px-3 sm:w-auto sm:min-w-40" />
        <div ref={anchorRef} className="contents">
          <button type="button" aria-expanded={open} aria-haspopup="dialog" aria-label={filtersLabel} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 px-3 text-sm" onClick={() => setOpen((value) => !value)}>
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Filters
            {count > 0 ? <span className="tabular-nums">{count}</span> : null}
          </button>
          {open ? (
            <>
              <button type="button" aria-label="Close filters" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={close} />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="list-view-heading list-filters-heading"
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-(--brass)/40 bg-(--bg) shadow-xl md:absolute md:inset-x-auto md:top-full md:right-0 md:bottom-auto md:mt-1 md:max-h-[80vh] md:w-[min(960px,calc(100vw-2rem))] md:max-w-full md:rounded-md"
              >
                <div className="flex items-center justify-between border-b border-(--border) bg-(--bg) px-4 py-3 md:hidden">
                  <h2 className="font-(--font-display) text-xl">Filters</h2>
                  <button type="button" aria-label="Close" className="inline-flex size-11 items-center justify-center" onClick={close}><X aria-hidden="true" className="size-5" /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PanelBody items={items} listId={listId} query={query} onChange={onChange} />
                </div>
                <footer className="flex items-center justify-between gap-3 border-t border-(--border) bg-(--bg) px-4 py-3 md:px-5">
                  <p className="text-sm text-(--ink-muted)">Showing {shown} of {total}</p>
                  <button type="button" className="min-h-11 rounded-md bg-accent px-4 text-sm text-(--bg)" onClick={close}>Done</button>
                </footer>
              </div>
            </>
          ) : null}
        </div>
        <ViewMenu custom={custom} view={query.view} onChange={onChange} />
        {onShuffle !== undefined ? <button type="button" className="h-11 px-3 text-sm" onClick={onShuffle}>Shuffle</button> : null}
      </div>
      {statusRow ? <StatusRow items={items} listId={listId} query={query} onChange={onChange} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button key={chip.key} type="button" aria-label={`Remove ${chip.label}`} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-(--brass)/50 bg-(--surface) pr-2 pl-3 text-sm" onClick={() => onChange(chip.clear)}>
            <span>{chip.label}</span>
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ))}
        {chips.length > 0 ? (
          <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm" onClick={() => onChange({ statuses: [], genres: [], smart: null, poster: 'any', q: '', yearMin: null, yearMax: null, ratingMin: null, creator: null, franchise: null, platform: null, unrated: false, favWant: false, favWatched: false })}>
            <Eraser aria-hidden="true" className="size-4" />
            Clear all
          </button>
        ) : null}
        <p className="text-sm text-(--ink-muted) md:ml-auto">Showing {shown} of {total}</p>
      </div>
    </div>
  )
}
