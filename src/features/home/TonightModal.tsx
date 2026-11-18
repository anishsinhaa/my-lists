import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clapperboard, Gamepad2, Layers, Sparkles, Tv, type LucideIcon } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { Button } from '@/design/Button'
import { StatusBadge } from '@/design/StatusBadge'
import { StatusGlyph } from '@/design/icons'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND, TAB_NAME, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
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

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function chipClass(on: boolean): string {
  return `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${on ? 'border-transparent bg-(--accent) text-(--bg)' : 'border-(--border) bg-(--surface) text-(--ink)'}`
}

function creatorLabel(listId: ListId): string {
  if (listId === 'books') return 'Author'
  if (listId === 'movies') return 'Director'
  return 'Creator'
}

function ResultMeta({ item }: { item: MediaItem }) {
  const parts = [
    item.year === null ? null : String(item.year),
    item.creator === null || item.creator.trim().length === 0 ? null : `${creatorLabel(item.listId)}: ${item.creator}`,
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
  const [frame, setFrame] = useState<MediaItem | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  const rows = useMemo(() => categoryItems(lists, choice.category), [lists, choice.category])
  const statuses = useMemo(() => statusChoices(choice.category, lists), [choice.category, lists])
  const genres = useMemo(() => topGenres(rows), [rows])
  const showRuntime = useMemo(() => categoryHasRuntime(rows), [rows])
  const matches = useMemo(() => tonightMatches(lists, { ...choice, short: showRuntime && choice.short }), [lists, choice, showRuntime])
  const chips = preset === 'other' || preset === 'curious'
    ? [{ id: preset, label: TAB_NAME[preset], icon: Layers }, ...CATEGORY_CHIPS]
    : CATEGORY_CHIPS

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
      if (timer.current !== null) window.clearInterval(timer.current)
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
    setFrame(winner)
    setPhase('result')
  }

  function pick() {
    const winner = choosePick(matches, lastId)
    if (winner === null) return
    if (reducedMotion() || matches.length < 2) {
      land(winner)
      return
    }
    const frames = spinFrames(matches, winner)
    if (timer.current !== null) window.clearInterval(timer.current)
    setPhase('spin')
    setFrame(frames[0] ?? winner)
    let index = 0
    timer.current = window.setInterval(() => {
      index += 1
      const next = frames[index]
      if (next === undefined) {
        if (timer.current !== null) window.clearInterval(timer.current)
        timer.current = null
        land(winner)
        return
      }
      setFrame(next)
    }, 120)
  }

  function openInList(item: MediaItem) {
    onClose()
    void navigate(itemHref(item))
  }

  const shown = phase === 'spin' ? frame : spot
  const countLabel = `${matches.length} to pick from`

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 md:items-center md:justify-center md:p-4" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonight-title"
        tabIndex={-1}
        className="flex h-dvh w-full flex-col overflow-y-auto bg-(--bg) p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-(--ink) outline-none md:h-auto md:max-h-[min(92dvh,760px)] md:max-w-lg md:rounded-(--radius) md:border md:border-(--brass) md:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="tonight-title" className="font-(--font-display) text-2xl">Pick for tonight</h2>
          <button type="button" className="min-h-11 px-3 text-sm" onClick={onClose}>Close</button>
        </div>
        {phase === 'choose' ? (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-xs tracking-wide text-(--ink-muted)">Category</legend>
              <div className="flex flex-wrap gap-2">
                {chips.map((entry) => {
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
                      {status.value}
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
        ) : shown === null ? null : (
          <div className="space-y-4">
            <div key={shown.id} className={phase === 'spin' ? 'tonight-slot mx-auto w-40' : 'mx-auto w-40'}>
              <PosterImage alt="" kind={LIST_KIND[shown.listId]} src={thumbnailUrl(shown.poster, 'w342')} title={displayTitle(shown.title, shown.year)} priority />
            </div>
            {phase === 'spin' ? <p className="text-center text-sm text-(--ink-muted)">Picking…</p> : (
              <div className="space-y-3">
                <h3 className="font-(--font-display) text-3xl leading-tight">{displayTitle(shown.title, shown.year)}</h3>
                <ResultMeta item={shown} />
                {shown.status.trim().length === 0 ? null : <StatusBadge listId={shown.listId} status={shown.status} />}
                {shown.genres.length === 0 ? null : (
                  <div className="flex flex-wrap gap-1.5">
                    {shown.genres.map((genre) => <span key={genre} className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{genre}</span>)}
                  </div>
                )}
                {shown.why.trim().length === 0 ? null : (
                  <div className="space-y-1">
                    <p className="text-xs tracking-wide text-(--ink-muted)">About</p>
                    <p className="text-base">{shown.why}</p>
                  </div>
                )}
                {shown.notes.trim().length === 0 ? null : (
                  <div className="space-y-1">
                    <p className="text-xs tracking-wide text-(--ink-muted)">My notes</p>
                    <p className="text-base">{shown.notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={pick}>Pick another</Button>
                  <Button variant="ghost" onClick={() => setPhase('choose')}>Change filters</Button>
                  <Button variant="ghost" onClick={() => openInList(shown)}>Open in list</Button>
                  <Button variant="ghost" onClick={onClose}>Close</Button>
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
