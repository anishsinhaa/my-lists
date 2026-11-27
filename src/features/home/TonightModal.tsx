import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clapperboard, Gamepad2, Layers, Sparkles, Tv, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/design/Button'
import { StatusBadge } from '@/design/StatusBadge'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, statusLabel } from '@/design/statusConfig'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel, formatRating } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { TonightReel } from './TonightReel'
import {
  categoryHasRuntime,
  categoryItems,
  choosePick,
  defaultStatuses,
  itemHref,
  readTonight,
  rememberTonight,
  SHORT_MINUTES,
  spinFrames,
  statusChoices,
  tonightMatches,
  topGenres,
  type TonightCategory,
  type TonightChoice,
} from './tonight'

const CATEGORY_CHIPS: { id: TonightCategory; label: string; icon: LucideIcon }[] = [
  { id: 'movies', label: 'Movies', icon: Clapperboard },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'any', label: 'Any', icon: Layers },
]

function chipClass(on: boolean): string {
  return `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${on ? 'border-transparent bg-(--accent) text-(--bg)' : 'border-(--border) bg-(--surface) text-(--ink)'}`
}

function creatorLabel(listId: ListId): string {
  if (listId === 'books') return 'Author'
  if (listId === 'movies') return 'Director'
  return 'Creator'
}

function tonightLabel(category: TonightCategory, value: string): string {
  if (category !== 'any') return statusLabel(category, value)
  const homes = ['movies', 'series', 'anime', 'games', 'books'] as const
  for (const id of homes) {
    const matched = matchStatus(id, value)
    if (matched.value.toLowerCase() === value.trim().toLowerCase() && matched.family !== 'none') return matched.label ?? matched.value
  }
  return value
}

function ResultMeta({ item }: { item: MediaItem }) {
  const parts = [
    item.year === null ? null : String(item.year),
    item.creator === null || item.creator.trim().length === 0 ? null : `${creatorLabel(item.listId)}: ${item.creator}`,
    item.myRating === null ? null : `My rating ${formatRating(item.myRating)}`,
    item.imdbRating === null ? null : `${externalRatingLabel(item.listId)} ${formatRating(item.imdbRating)}`,
  ].filter((part) => part !== null)
  if (parts.length === 0) return null
  return <p className="text-sm text-(--ink-muted)">{parts.join(' · ')}</p>
}

export function TonightModal({ lists, preset, onClose }: {
  lists: Record<ListId, MediaItem[]>
  preset?: TonightCategory
  onClose: () => void
}) {
  const navigate = useNavigate()
  const initial = useMemo(() => readTonight(lists, preset), [lists, preset])
  const [choice, setChoice] = useState<TonightChoice>(initial)
  const [phase, setPhase] = useState<'choose' | 'spin' | 'result'>('choose')
  const [spot, setSpot] = useState<MediaItem | null>(null)
  const [frames, setFrames] = useState<MediaItem[] | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  const rows = useMemo(() => categoryItems(lists, choice.category), [lists, choice.category])
  const statuses = useMemo(() => statusChoices(choice.category, lists), [choice.category, lists])
  const genres = useMemo(() => topGenres(rows), [rows])
  const showRuntime = useMemo(() => categoryHasRuntime(rows), [rows])
  const matches = useMemo(() => tonightMatches(lists, { ...choice, short: showRuntime && choice.short }), [lists, choice, showRuntime])

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    rememberTonight({ category: choice.category, statuses: choice.statuses })
  }, [choice.category, choice.statuses])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function update(next: Partial<TonightChoice>) {
    setChoice((current) => ({ ...current, ...next }))
  }

  function selectCategory(category: TonightCategory) {
    setChoice({ category, statuses: defaultStatuses(category), genres: [], short: false })
    setPhase('choose')
  }

  function toggleStatus(value: string) {
    const selected = choice.statuses.some((status) => status.toLowerCase() === value.toLowerCase())
    const statuses = selected
      ? choice.statuses.filter((status) => status.toLowerCase() !== value.toLowerCase())
      : [...choice.statuses, value]
    update({ statuses })
  }

  function toggleGenre(genre: string) {
    const selected = choice.genres.includes(genre)
    update({ genres: selected ? choice.genres.filter((value) => value !== genre) : [...choice.genres, genre] })
  }

  function land(winner: MediaItem) {
    setLastId(winner.id)
    setSpot(winner)
    setPhase('result')
  }

  function pick() {
    const winner = choosePick(matches, lastId)
    if (winner === null) return
    const nextFrames = matches.length < 2 ? [winner] : spinFrames(matches, winner)
    setFrames(nextFrames)
    setSpot(winner)
    if (matches.length < 2) {
      land(winner)
      return
    }
    setPhase('spin')
  }

  function openInList(item: MediaItem) {
    onClose()
    void navigate(itemHref(item))
  }

  const countLabel = `${matches.length} to pick from`
  const reelFrames = frames ?? (spot === null ? null : [spot])

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 md:items-center md:justify-center md:p-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonight-title"
        tabIndex={-1}
        className="flex h-dvh w-full flex-col bg-(--bg) p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-(--ink) outline-none md:h-[min(88dvh,640px)] md:w-[32rem] md:rounded-(--radius) md:border md:border-(--brass) md:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="tonight-title" className="font-(--font-display) text-2xl">Pick for tonight</h2>
          <button type="button" aria-label="Close" className="inline-flex size-11 shrink-0 items-center justify-center" onClick={onClose}><X aria-hidden="true" className="size-5" /></button>
        </div>
        {phase === 'choose' ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <fieldset className="space-y-2">
              <legend className="text-xs tracking-wide text-(--ink-muted)">Category</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_CHIPS.map((entry) => {
                  const Icon = entry.icon
                  const on = choice.category === entry.id
                  return (
                    <button key={entry.id} type="button" aria-pressed={on} className={chipClass(on)} onClick={() => selectCategory(entry.id)}>
                      <Icon aria-hidden="true" className="size-4" />
                      {entry.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-xs tracking-wide text-(--ink-muted)">Status</legend>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={choice.statuses.length === 0} className={chipClass(choice.statuses.length === 0)} onClick={() => update({ statuses: [] })}>All</button>
                {statuses.map((status) => {
                  const on = choice.statuses.some((value) => value.toLowerCase() === status.value.toLowerCase())
                  return (
                    <button key={status.value} type="button" aria-pressed={on} className={chipClass(on)} onClick={() => toggleStatus(status.value)}>
                      <StatusGlyph name={status.icon} />
                      {tonightLabel(choice.category, status.value)}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            {genres.length === 0 ? null : (
              <fieldset className="space-y-2">
                <legend className="text-xs tracking-wide text-(--ink-muted)">Genre</legend>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => {
                    const on = choice.genres.includes(genre)
                    return <button key={genre} type="button" aria-pressed={on} className={chipClass(on)} onClick={() => toggleGenre(genre)}>{genre}</button>
                  })}
                </div>
              </fieldset>
            )}
            {showRuntime ? (
              <button type="button" aria-pressed={choice.short} className={chipClass(choice.short)} onClick={() => update({ short: !choice.short })}>
                Short
                <span className="text-xs">≤ {SHORT_MINUTES} min</span>
              </button>
            ) : null}
            <p aria-live="polite" className="text-sm text-(--ink-muted)">{countLabel}</p>
            <Button disabled={matches.length === 0} onClick={pick}>Pick</Button>
          </div>
        ) : spot === null || reelFrames === null ? null : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <TonightReel frames={reelFrames} spinning={phase === 'spin'} onLand={land} />
            {phase === 'spin' ? <p className="sr-only" aria-live="polite">Picking…</p> : (
              <div className="space-y-3">
                <h3 className="font-(--font-display) text-3xl leading-tight">{displayTitle(spot.title, spot.year)}</h3>
                <ResultMeta item={spot} />
                {spot.status.trim().length === 0 ? null : <StatusBadge listId={spot.listId} status={spot.status} />}
                {spot.genres.length === 0 ? null : (
                  <div className="flex flex-wrap gap-1.5">
                    {spot.genres.map((genre) => <span key={genre} className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{genre}</span>)}
                  </div>
                )}
                {spot.why.trim().length === 0 ? null : (
                  <div className="space-y-1">
                    <p className="text-xs tracking-wide text-(--ink-muted)">About</p>
                    <p className="text-base">{spot.why}</p>
                  </div>
                )}
                {spot.notes.trim().length === 0 ? null : (
                  <div className="space-y-1">
                    <p className="text-xs tracking-wide text-(--ink-muted)">My notes</p>
                    <p className="text-base">{spot.notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={pick}>Pick another</Button>
                  <Button variant="ghost" onClick={() => setPhase('choose')}>Change filters</Button>
                  <Button variant="ghost" onClick={() => openInList(spot)}>Open in list</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TonightButton({ className = '', onClick }: { className?: string; onClick: () => void }) {
  return (
    <button type="button" className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border border-(--brass)/40 px-3 text-sm ${className}`} onClick={onClick}>
      Pick for tonight
    </button>
  )
}
