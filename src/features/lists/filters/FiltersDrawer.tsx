import { useId, useState, type ReactNode, type RefObject } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Calendar, ChevronDown, Eye, Gamepad2, Layers, LayoutGrid, Rows3, SlidersHorizontal, Sparkles, Star, Tags, UserRound, X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, shelfOrder, statusLabel } from '@/design/statusConfig'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { groupOptions } from '../groupOptions'
import { hasFinishedColumn, sortOptions } from '../sortOptions'
import { finishedOn, SMART_VIEWS } from '../smart/smartViews'
import { clearFiltersPatch, filterBadgeCount, resetViewPatch, viewIsCustom } from '../viewPrefs'
import { Choice } from './choice'
import { LayoutToggle } from './LayoutToggle'
import { FILTER_CONFIG } from './filterConfig'
import { ADDED_WITHIN_OPTIONS, type ListQuery, type RatingBy } from './listQuery'

const KEPT_VIEWS = new Set(['nolan', 'marvel', 'top-rated', 'recent'])

function frequent(values: Array<string | null>): string[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value === null || value.length === 0) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([value]) => value)
}

function yearValue(raw: string): number | null {
  if (raw.trim().length === 0) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function yearSummary(query: ListQuery): string {
  if (query.yearMin !== null && query.yearMax !== null) return `${query.yearMin}–${query.yearMax}`
  if (query.yearMin !== null) return `${query.yearMin}–`
  if (query.yearMax !== null) return `–${query.yearMax}`
  return 'Any'
}

function joined(values: string[]): string {
  return values.length === 0 ? 'Any' : values.join(', ')
}

function statusOn(listId: ListId, selected: string[], value: string): boolean {
  const canonical = matchStatus(listId, value).value
  return selected.some((status) => matchStatus(listId, status).value === canonical)
}

function toggleStatus(listId: ListId, query: ListQuery, value: string): string[] {
  const canonical = matchStatus(listId, value).value
  if (statusOn(listId, query.statuses, canonical)) return query.statuses.filter((status) => matchStatus(listId, status).value !== canonical)
  return [...query.statuses, canonical]
}

// Status appears when the list has a shelf vocabulary or any item carries a status.
// Other has neither until a row has one; that value then shows up through the extra branch.
function statusChoices(listId: ListId, items: MediaItem[]): { value: string; count: number; icon: ReactNode }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = matchStatus(listId, item.status).value
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const known = [...shelfOrder(listId)]
  const extra = [...counts.keys()].filter((key) => key !== 'No status' && !known.some((row) => row.value === key))
  const rows = [...known, ...extra.map((value) => matchStatus(listId, value))]
  if ((counts.get('No status') ?? 0) > 0) rows.push(matchStatus(listId, ''))
  return rows.map((row) => ({ value: row.value, count: counts.get(row.value) ?? 0, icon: <StatusGlyph name={row.icon} /> }))
}

function FilterSwitch({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={pressed} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm" onClick={onClick}>
      <span>{label}</span>
      <span className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 ${pressed ? 'justify-end border-transparent bg-accent' : 'border-(--brass)/40 bg-(--surface)'}`}>
        <span className="size-5 rounded-full bg-(--bg)" />
      </span>
    </button>
  )
}

function FilterGroup({ title, icon, summary, active, children }: {
  title: string
  icon: ReactNode
  summary: string
  active: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(active)
  const panelId = useId()
  return (
    <div className="border-b border-(--border)">
      <button type="button" aria-expanded={open} aria-controls={panelId} className="flex min-h-11 w-full items-center gap-2 text-left text-sm" onClick={() => setOpen((value) => !value)}>
        {icon}
        <span className="font-medium">{title}</span>
        <span className="ml-auto min-w-0 truncate text-(--ink-muted)">{summary}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div id={panelId} className="pb-3">{children}</div> : null}
    </div>
  )
}

function ChipSearch({ label, values, children }: { label: string; values: string[]; children: (shown: string[]) => ReactNode }) {
  const [text, setText] = useState('')
  const needle = text.trim().toLowerCase()
  const shown = needle.length === 0 ? values : values.filter((value) => value.toLowerCase().includes(needle))
  return (
    <div className="space-y-2">
      {values.length > 12 ? (
        <input aria-label={label} value={text} placeholder={label} onChange={(event) => setText(event.target.value)} className="h-11 w-full rounded-md border border-border bg-(--surface) px-3 text-sm" />
      ) : null}
      {children(shown)}
    </div>
  )
}

function swallowOutside(onClose: () => void) {
  return (event: { preventDefault: () => void; detail: { originalEvent: Event } }) => {
    event.preventDefault()
    event.detail.originalEvent.preventDefault()
    event.detail.originalEvent.stopPropagation()
    onClose()
    const swallow = (follow: Event) => {
      follow.preventDefault()
      follow.stopPropagation()
    }
    window.addEventListener('pointerup', swallow, { capture: true, once: true })
    window.addEventListener('click', swallow, { capture: true, once: true })
    // Dialog defers this callback until the click, so the listeners above miss
    // the event that is already underway. Drop any that did not run before the
    // next task, or they swallow an unrelated click later.
    queueMicrotask(() => {
      window.removeEventListener('pointerup', swallow, true)
      window.removeEventListener('click', swallow, true)
    })
  }
}

export function FiltersDrawer({ listId, items, query, shown, total, open, onOpenChange, onChange, returnFocus, layoutOptions }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  layoutOptions?: ReadonlyArray<ListQuery['view']>
  shown: number
  total: number
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (partial: Partial<ListQuery>) => void
  returnFocus: RefObject<HTMLButtonElement | null>
}) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const sortLabelId = useId()
  const groupLabelId = useId()
  const layoutLabelId = useId()
  const config = FILTER_CONFIG[listId]
  const count = filterBadgeCount(query)
  const sorts = sortOptions(listId, hasFinishedColumn(listId, items))
  const groups = groupOptions(listId, items)
  const genres = frequent(items.flatMap((item) => item.genres))
  const creators = frequent(items.map((item) => item.creator))
  const franchises = frequent(items.map((item) => item.franchise))
  const platforms = frequent(items.map((item) => item.platform))
  const ratingName = externalRatingLabel(listId)
  const views = SMART_VIEWS[listId].filter((view) => {
    if (!KEPT_VIEWS.has(view.id)) return false
    if (view.id !== 'recent') return true
    return items.some((item) => finishedOn(item) !== null)
  })
  const statuses = statusChoices(listId, items)
  const typeValues = config.facets?.type === true ? frequent(items.map((item) => {
    const type = (item.extra['type'] ?? '').trim()
    return type.length === 0 ? null : type
  })) : []
  const directionWord = query.dir === 'asc' ? 'Ascending' : 'Descending'
  const directionVisible = query.sort === 'title' ? (query.dir === 'asc' ? 'A–Z' : 'Z–A') : directionWord
  const directionLabel = `Sort direction: ${directionWord}`
  const addedLabel = ADDED_WITHIN_OPTIONS.find((option) => option.value === query.addedWithin)?.label ?? 'Any'
  const close = () => onOpenChange(false)
  const ratingSummary = query.ratingMin !== null ? `${query.ratingMin}+` : query.ratingBy === 'my' ? 'Mine' : query.ratingBy === 'external' ? ratingName : 'Any'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? 'right' : 'bottom'}
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current?.focus()
        }}
        onPointerDownOutside={swallowOutside(close)}
        className={desktop
          ? 'z-50 h-dvh w-[min(460px,100vw)] max-w-none gap-0 overflow-hidden bg-(--bg) p-0 text-(--ink) sm:max-w-none'
          : 'z-50 max-h-[90dvh] w-full gap-0 overflow-hidden rounded-t-2xl bg-(--bg) p-0 text-(--ink)'}
      >
        <div className="shrink-0 bg-(--bg)">
          {desktop ? null : <div className="flex justify-center pt-2" aria-hidden="true"><span className="h-1.5 w-10 rounded-full bg-(--border)" /></div>}
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-(--border) px-4 py-3">
            <div>
              <SheetTitle className="font-(--font-display) text-xl">Filters & view{count > 0 ? ` · ${count}` : ''}</SheetTitle>
              <SheetDescription className="sr-only">Choose how the list looks and what it shows</SheetDescription>
            </div>
            <button type="button" aria-label="Close filters" className="inline-flex size-11 items-center justify-center" onClick={close}><X aria-hidden="true" className="size-5" /></button>
          </SheetHeader>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-(--font-display) text-lg"><LayoutGrid aria-hidden="true" className="size-4" />View</h2>
            <div className="space-y-1">
              <label id={layoutLabelId} className="text-xs text-(--ink-muted)">Layout</label>
              <LayoutToggle labelledBy={layoutLabelId} options={layoutOptions} view={query.view} onChange={onChange} />
            </div>
            <div className="space-y-1">
              <label id={sortLabelId} className="text-xs text-(--ink-muted)">Sort by</label>
              <div className="flex items-center gap-2">
                <Select value={query.sort} onValueChange={(value) => {
                  const option = sorts.find((item) => item.key === value)
                  if (option === undefined) return
                  onChange({ sort: option.key, dir: option.dir })
                }}>
                  <SelectTrigger aria-labelledby={sortLabelId} className="min-h-11 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[60] border-(--border) bg-(--surface) text-(--ink)">
                    {sorts.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button type="button" aria-label={directionLabel} title={directionLabel} className="inline-flex h-11 items-center gap-1 rounded-md border border-(--brass)/40 px-2 text-xs" onClick={() => onChange({ dir: query.dir === 'asc' ? 'desc' : 'asc' })}>
                  {query.dir === 'asc' ? <ArrowUpNarrowWide aria-hidden="true" className="size-4" /> : <ArrowDownWideNarrow aria-hidden="true" className="size-4" />}
                  <span>{directionVisible}</span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label id={groupLabelId} className="text-xs text-(--ink-muted)">Group by</label>
              <Select value={query.group} onValueChange={(value) => {
                const option = groups.find((item) => item.key === value)
                if (option === undefined) return
                onChange(option.key === 'none' && query.view === 'shelves' ? { group: 'none', view: 'grid' } : { group: option.key })
              }}>
                <SelectTrigger aria-labelledby={groupLabelId} className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[60] border-(--border) bg-(--surface) text-(--ink)">
                  {groups.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <button type="button" className="min-h-11 text-sm text-(--ink-muted) disabled:opacity-40" disabled={!viewIsCustom(query)} onClick={() => onChange(resetViewPatch())}>Reset view</button>
          </section>
          <section className="space-y-1">
            <h2 className="flex items-center gap-2 font-(--font-display) text-lg"><Eye aria-hidden="true" className="size-4" />Show</h2>
            <FilterSwitch label="Unrated" pressed={query.unrated} onClick={() => onChange({ unrated: !query.unrated })} />
            <FilterSwitch label="Fav Want to" pressed={query.favWant} onClick={() => onChange({ favWant: !query.favWant })} />
            <FilterSwitch label="Fav Watched" pressed={query.favWatched} onClick={() => onChange({ favWatched: !query.favWatched })} />
          </section>
          <section className="space-y-1">
            <h2 className="mb-1 flex items-center gap-2 font-(--font-display) text-lg"><SlidersHorizontal aria-hidden="true" className="size-4" />Filters</h2>
            {statuses.length > 0 ? (
              <FilterGroup icon={<Rows3 className="size-4" aria-hidden="true" />} title="Status" summary={joined(query.statuses.map((status) => statusLabel(listId, status)))} active={query.statuses.length > 0}>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((row) => (
                    <Choice key={row.value} count={row.count} icon={row.icon} listId={listId} pressed={statusOn(listId, query.statuses, row.value)} onClick={() => onChange({ statuses: toggleStatus(listId, query, row.value) })}>{statusLabel(listId, row.value)}</Choice>
                  ))}
                </div>
              </FilterGroup>
            ) : null}
            {typeValues.length > 0 ? (
              <FilterGroup icon={<Tags className="size-4" aria-hidden="true" />} title="Type" summary={joined(query.types)} active={query.types.length > 0}>
                <div className="flex flex-wrap gap-2">
                  {typeValues.map((type) => {
                    const count = items.filter((item) => (item.extra['type'] ?? '').trim().toLowerCase() === type.toLowerCase()).length
                    const on = query.types.some((value) => value.toLowerCase() === type.toLowerCase())
                    return (
                      <Choice key={type} count={count} listId={listId} pressed={on} onClick={() => onChange({ types: on ? query.types.filter((value) => value.toLowerCase() !== type.toLowerCase()) : [...query.types, type] })}>{type}</Choice>
                    )
                  })}
                </div>
              </FilterGroup>
            ) : null}
            <FilterGroup icon={<Calendar className="size-4" aria-hidden="true" />} title="Added within" summary={query.addedWithin === 'any' ? 'Any' : addedLabel} active={query.addedWithin !== 'any'}>
              <div className="flex flex-wrap gap-2">
                {ADDED_WITHIN_OPTIONS.map((option) => (
                  <Choice key={option.value} listId={listId} pressed={query.addedWithin === option.value} onClick={() => onChange({ addedWithin: option.value })}>{option.label}</Choice>
                ))}
              </div>
            </FilterGroup>
            {config.show.genre && genres.length > 0 ? (
              <FilterGroup icon={<Tags className="size-4" aria-hidden="true" />} title="Genre" summary={joined(query.genres)} active={query.genres.length > 0}>
                <ChipSearch label="Search genres…" values={genres}>
                  {(options) => (
                    <div className="flex flex-wrap gap-2">
                      {options.map((genre) => (
                        <Choice key={genre} listId={listId} pressed={query.genres.includes(genre)} onClick={() => onChange({ genres: query.genres.includes(genre) ? query.genres.filter((value) => value !== genre) : [...query.genres, genre] })}>{genre}</Choice>
                      ))}
                    </div>
                  )}
                </ChipSearch>
              </FilterGroup>
            ) : null}
            {config.show.year ? (
              <FilterGroup icon={<Calendar className="size-4" aria-hidden="true" />} title="Year" summary={yearSummary(query)} active={query.yearMin !== null || query.yearMax !== null}>
                <div className="flex gap-3">
                  <label className="text-sm">From
                    <input aria-label="From year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMin ?? ''} onChange={(event) => onChange({ yearMin: yearValue(event.target.value) })} />
                  </label>
                  <label className="text-sm">Until
                    <input aria-label="Until year" inputMode="numeric" className="mt-1 block h-11 w-28 rounded-md border border-border bg-(--surface) px-2" value={query.yearMax ?? ''} onChange={(event) => onChange({ yearMax: yearValue(event.target.value) })} />
                  </label>
                </div>
              </FilterGroup>
            ) : null}
            {config.show.creator && creators.length > 0 ? (
              <FilterGroup icon={<UserRound className="size-4" aria-hidden="true" />} title={config.creatorLabel} summary={query.creator === null || query.creator.length === 0 ? 'Any' : query.creator} active={query.creator !== null && query.creator.length > 0}>
                <ChipSearch label={`Search ${config.creatorLabel.toLowerCase()}…`} values={creators}>
                  {(options) => (
                    <div className="flex flex-wrap gap-2">
                      {options.map((creator) => (
                        <Choice key={creator} listId={listId} pressed={query.creator === creator} onClick={() => onChange({ creator: query.creator === creator ? null : creator })}>{creator}</Choice>
                      ))}
                    </div>
                  )}
                </ChipSearch>
              </FilterGroup>
            ) : null}
            {config.show.franchise && franchises.length > 0 ? (
              <FilterGroup icon={<Layers className="size-4" aria-hidden="true" />} title={config.franchiseLabel} summary={query.franchise === null || query.franchise.length === 0 ? 'Any' : query.franchise} active={query.franchise !== null && query.franchise.length > 0}>
                <ChipSearch label={`Search ${config.franchiseLabel.toLowerCase()}…`} values={franchises}>
                  {(options) => (
                    <div className="flex flex-wrap gap-2">
                      {options.map((franchise) => (
                        <Choice key={franchise} listId={listId} pressed={query.franchise === franchise} onClick={() => onChange({ franchise: query.franchise === franchise ? null : franchise })}>{franchise}</Choice>
                      ))}
                    </div>
                  )}
                </ChipSearch>
              </FilterGroup>
            ) : null}
            {config.show.platform && platforms.length > 0 ? (
              <FilterGroup icon={<Gamepad2 className="size-4" aria-hidden="true" />} title="Platform" summary={query.platform === null || query.platform.length === 0 ? 'Any' : query.platform} active={query.platform !== null && query.platform.length > 0}>
                <ChipSearch label="Search platforms…" values={platforms}>
                  {(options) => (
                    <div className="flex flex-wrap gap-2">
                      {options.map((platform) => (
                        <Choice key={platform} listId={listId} pressed={query.platform === platform} onClick={() => onChange({ platform: query.platform === platform ? null : platform })}>{platform}</Choice>
                      ))}
                    </div>
                  )}
                </ChipSearch>
              </FilterGroup>
            ) : null}
            {config.show.rating ? (
              <FilterGroup icon={<Star className="size-4" aria-hidden="true" />} title="Rating" summary={ratingSummary} active={query.ratingMin !== null || query.ratingBy !== 'best'}>
                <div className="flex flex-wrap gap-2">
                  {[6, 7, 8, 9].map((min) => (
                    <Choice key={min} listId={listId} pressed={query.ratingMin === min} onClick={() => onChange({ ratingMin: query.ratingMin === min ? null : min })}>{`${min}+`}</Choice>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([['best', 'Best'], ['my', 'Mine'], ['external', ratingName]] as const).map(([value, name]) => (
                    <Choice key={value} listId={listId} pressed={query.ratingBy === value} onClick={() => onChange({ ratingBy: value as RatingBy })}>{name}</Choice>
                  ))}
                </div>
              </FilterGroup>
            ) : null}
            {views.length > 0 ? (
              <FilterGroup icon={<Sparkles className="size-4" aria-hidden="true" />} title="Smart views" summary={views.find((view) => view.id === query.smart)?.label ?? 'Any'} active={query.smart !== null && query.smart.length > 0}>
                <div className="flex flex-wrap gap-2">
                  {views.map((view) => (
                    <Choice key={view.id} listId={listId} pressed={query.smart === view.id} onClick={() => onChange({ smart: query.smart === view.id ? null : view.id })}>{view.label}</Choice>
                  ))}
                </div>
              </FilterGroup>
            ) : null}
            <FilterGroup icon={<LayoutGrid className="size-4" aria-hidden="true" />} title="Poster" summary={query.poster === 'has' ? 'Has poster' : query.poster === 'missing' ? 'Missing poster' : 'Any'} active={query.poster !== 'any'}>
              <div className="flex flex-wrap gap-2">
                {([['any', 'Any'], ['has', 'Has poster'], ['missing', 'Missing poster']] as const).map(([value, name]) => (
                  <Choice key={value} listId={listId} pressed={query.poster === value} onClick={() => onChange({ poster: value })}>{name}</Choice>
                ))}
              </div>
            </FilterGroup>
          </section>
        </div>
        <SheetFooter className={`shrink-0 flex-row items-center justify-between gap-3 border-t border-(--border) bg-(--bg) px-4 py-3 ${desktop ? '' : 'pb-[env(safe-area-inset-bottom)]'}`}>
          <p className="text-sm text-(--ink-muted)">Showing {shown} of {total}</p>
          <div className="flex items-center gap-2">
            <button type="button" className="min-h-11 px-2 text-sm text-(--ink-muted) disabled:opacity-40" disabled={count === 0} onClick={() => onChange(clearFiltersPatch())}>Clear filters</button>
            <button type="button" className="min-h-11 rounded-md bg-accent px-4 text-sm text-(--bg)" onClick={close}>Done</button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
