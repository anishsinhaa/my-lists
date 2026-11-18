import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { ArrowDownUp, Calendar, Check, ChevronDown, Eraser, Gamepad2, Group, Layers, LayoutGrid, Rows3, SlidersHorizontal, Sparkles, Star, Table2, Tags, UserRound, X } from 'lucide-react'
import { IconButton } from '@/design/IconButton'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, shelfOrder } from '@/design/statusConfig'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { groupOptions } from '../groupOptions'
import { hasFinishedColumn, sortChipLabel, sortOptions } from '../sortOptions'
import { finishedOn, SMART_VIEWS } from '../smart/smartViews'
import { FILTER_CONFIG } from './filterConfig'
import type { ListQuery, RatingBy } from './listQuery'

const KEPT_VIEWS = new Set(['nolan', 'marvel', 'top-rated', 'recent'])

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

function FilterSections({ listId, items, query, onChange }: {
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
  const [open, setOpen] = useState<string | null>(null)
  function toggle(id: string) {
    setOpen((current) => current === id ? null : id)
  }
  return (
    <div>
      <Section icon={<ArrowDownUp className="size-4" aria-hidden="true" />} open={open === 'sort'} title="Sort by" onToggle={() => toggle('sort')}>
        <div role="radiogroup" aria-label="Sort by" className="flex flex-wrap gap-2">
          {sorts.map((option) => {
            const selected = query.sort === option.key
            return (
              <Choice key={option.key} listId={listId} pressed={selected} onClick={() => onChange(selected ? { dir: query.dir === 'asc' ? 'desc' : 'asc' } : { sort: option.key, dir: option.dir })}>
                {sortChipLabel(option, selected, query.dir)}
              </Choice>
            )
          })}
        </div>
      </Section>
      <Section icon={<Group className="size-4" aria-hidden="true" />} open={open === 'group'} title="Group by" onToggle={() => toggle('group')}>
        <div role="radiogroup" aria-label="Group by" className="flex flex-wrap gap-2">
          {groups.map((option) => (
            <Choice key={option.key} listId={listId} pressed={query.group === option.key} onClick={() => onChange(option.key === 'none' && query.view === 'shelves' ? { group: 'none', view: 'grid' } : { group: option.key })}>
              {option.label}
            </Choice>
          ))}
        </div>
      </Section>
      {config.show.genre && genres.length > 0 ? (
        <Section icon={<Tags className="size-4" aria-hidden="true" />} open={open === 'genre'} title="Genre" onToggle={() => toggle('genre')}>
          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 24).map((genre) => (
              <Choice key={genre} listId={listId} pressed={query.genres.includes(genre)} onClick={() => onChange({ genres: query.genres.includes(genre) ? query.genres.filter((value) => value !== genre) : [...query.genres, genre] })}>{genre}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
      {config.show.year ? (
        <Section icon={<Calendar className="size-4" aria-hidden="true" />} open={open === 'year'} title="Year" onToggle={() => toggle('year')}>
          <div className="flex gap-2">
            <label className="text-sm">From
              <input aria-label="From year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMin ?? ''} onChange={(event) => onChange({ yearMin: yearValue(event.target.value) })} />
            </label>
            <label className="text-sm">Until
              <input aria-label="Until year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMax ?? ''} onChange={(event) => onChange({ yearMax: yearValue(event.target.value) })} />
            </label>
          </div>
        </Section>
      ) : null}
      {config.show.creator && creators.length > 0 ? (
        <Section icon={<UserRound className="size-4" aria-hidden="true" />} open={open === 'creator'} title={config.creatorLabel} onToggle={() => toggle('creator')}>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {creators.slice(0, 24).map((creator) => (
              <Choice key={creator} listId={listId} pressed={query.creator === creator} onClick={() => onChange({ creator: query.creator === creator ? null : creator })}>{creator}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
      {config.show.franchise && franchises.length > 0 ? (
        <Section icon={<Layers className="size-4" aria-hidden="true" />} open={open === 'franchise'} title={config.franchiseLabel} onToggle={() => toggle('franchise')}>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {franchises.slice(0, 24).map((franchise) => (
              <Choice key={franchise} listId={listId} pressed={query.franchise === franchise} onClick={() => onChange({ franchise: query.franchise === franchise ? null : franchise })}>{franchise}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
      {config.show.platform && platforms.length > 0 ? (
        <Section icon={<Gamepad2 className="size-4" aria-hidden="true" />} open={open === 'platform'} title="Platform" onToggle={() => toggle('platform')}>
          <div className="flex flex-wrap gap-2">
            {platforms.slice(0, 12).map((platform) => (
              <Choice key={platform} listId={listId} pressed={query.platform === platform} onClick={() => onChange({ platform: query.platform === platform ? null : platform })}>{platform}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
      {config.show.rating ? (
        <Section icon={<Star className="size-4" aria-hidden="true" />} open={open === 'rating'} title="Rating" onToggle={() => toggle('rating')}>
          <div className="flex flex-wrap gap-2">
            {[6, 7, 8, 9].map((min) => (
              <Choice key={min} listId={listId} pressed={query.ratingMin === min} onClick={() => onChange({ ratingMin: query.ratingMin === min ? null : min })}>{`${min}+`}</Choice>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['best', 'Best'], ['my', 'Mine'], ['external', label]] as const).map(([value, name]) => (
              <Choice key={value} listId={listId} pressed={query.ratingBy === value} onClick={() => onChange({ ratingBy: value as RatingBy })}>{name}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
      {views.length > 0 ? (
        <Section icon={<Sparkles className="size-4" aria-hidden="true" />} open={open === 'smart'} title="Smart views" onToggle={() => toggle('smart')}>
          <div className="flex flex-wrap gap-2">
            {views.map((view) => (
              <Choice key={view.id} listId={listId} pressed={query.smart === view.id} onClick={() => onChange({ smart: query.smart === view.id ? null : view.id })}>{view.label}</Choice>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  )
}

function Section({ icon, title, open, onToggle, children }: { icon: ReactNode; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="border-b border-border">
      <button type="button" aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-medium" onClick={onToggle}>
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </div>
  )
}

function yearValue(raw: string): number | null {
  if (raw.trim().length === 0) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

interface ActiveChip {
  key: string
  label: string
  clear: Partial<ListQuery>
}

function activeChips(listId: ListId, query: ListQuery): ActiveChip[] {
  const chips: ActiveChip[] = []
  if (query.q.length > 0) chips.push({ key: 'q', label: `Search: ${query.q}`, clear: { q: '' } })
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

export function FilterChrome({ listId, items, query, shown, total, onChange, onShuffle }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  shown: number
  total: number
  onChange: (partial: Partial<ListQuery>) => void
  onShuffle?: () => void
}) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closePanel = useCallback(() => {
    setPinned(false)
    setHover(false)
  }, [])
  const closeDrawer = useCallback(() => setDrawer(false), [])
  useDismiss(pinned || hover, closePanel, panelRef)
  useDismiss(drawer, closeDrawer, drawerRef)
  const panel = pinned || hover
  const chips = activeChips(listId, query)
  const statusRow = !COUNTS_FILTER.has(listId)

  return (
    <div className="filter-sticky space-y-2 bg-(--bg)/90 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <input id="list-search" value={query.q} onChange={(event) => onChange({ q: event.target.value })} placeholder="Search this list" aria-label="Search this list" className="h-11 w-full min-w-0 flex-1 rounded-md border border-border bg-(--surface) px-3 sm:w-auto sm:min-w-40" />
        <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 px-3 text-sm md:hidden" onClick={() => setDrawer(true)}>
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
        </button>
        <div ref={panelRef} className="relative hidden md:block" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <button type="button" aria-expanded={panel} className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 px-3 text-sm" onClick={() => setPinned((value) => !value)}>
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Filters
          </button>
          {panel ? (
            <div className="absolute right-0 z-30 mt-1 max-h-[80vh] w-160 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-(--brass)/40 bg-(--bg) p-4 shadow-xl">
              <FilterSections items={items} listId={listId} query={query} onChange={onChange} />
            </div>
          ) : null}
        </div>
        <div role="radiogroup" aria-label="View" className="flex gap-1">
          {([['shelves', Rows3, 'Shelves'], ['grid', LayoutGrid, 'Grid'], ['table', Table2, 'Table']] as const).map(([value, Icon, name]) => (
            <IconButton key={value} aria-pressed={query.view === value} className={query.view === value ? 'bg-accent text-(--bg)' : ''} label={name} onClick={() => onChange({ view: value })}><Icon className="size-4" /></IconButton>
          ))}
        </div>
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
          <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm" onClick={() => onChange({ statuses: [], genres: [], smart: null, poster: 'any', q: '', yearMin: null, yearMax: null, ratingMin: null, creator: null, franchise: null, platform: null })}>
            <Eraser aria-hidden="true" className="size-4" />
            Clear all
          </button>
        ) : null}
        <p className="text-sm text-(--ink-muted) md:ml-auto">Showing {shown} of {total}</p>
      </div>
      {drawer ? (
        <div ref={drawerRef} className="md:hidden">
          <button type="button" aria-label="Close filters" className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border border-(--brass)/40 bg-(--bg) p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-(--font-display) text-xl">Filters</h2>
              <button type="button" className="min-h-11 px-3" onClick={() => setDrawer(false)}>Close</button>
            </div>
            <FilterSections items={items} listId={listId} query={query} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
