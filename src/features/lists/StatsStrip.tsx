import { useMemo } from 'react'
import { Check, Star } from 'lucide-react'
import { SegmentedBar } from '@/design/Stat'
import { StatusGlyph } from '@/design/icons'
import { matchStatus, shelfOrder, type StatusFamily } from '@/design/statusConfig'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { ListQuery } from './filters/listQuery'
import { computeStats } from './stats/computeStats'

const TONE: Record<StatusFamily, string> = {
  active: 'bg-accent',
  queue: 'bg-(--brass)',
  done: 'bg-emerald-700',
  parked: 'bg-amber-700',
  dropped: 'bg-zinc-500',
  none: 'bg-(--ink-muted)',
}

const SHAPE: Record<ListId, string> = {
  movies: 'rounded-[2px_14px_2px_14px] border-dashed border-[#d4af37]',
  series: 'rounded-md border-2 border-[#5c4033]',
  anime: 'rounded-md border-[3px] border-[#1b1b3a] shadow-[3px_3px_0_#1b1b3a]',
  games: 'rounded-sm border border-[#00f0ff]',
  books: 'rounded-sm border border-[#8c5a3c] border-l-4',
  other: 'rounded-md border border-[#5eead4]/40',
  curious: 'rounded-md border border-[#b08d57]/50',
}

function statusOn(listId: ListId, selected: string[], value: string): boolean {
  const canonical = matchStatus(listId, value).value
  return selected.some((status) => matchStatus(listId, status).value === canonical)
}

export function StatsStrip({ listId, items, query, onChange }: {
  listId: ListId
  items: MediaItem[]
  query: ListQuery
  onChange: (partial: Partial<ListQuery>) => void
}) {
  const stats = useMemo(() => computeStats(items), [items])
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
    return [...known, ...extra.map((value) => matchStatus(listId, value))].filter((row) => (counts.get(row.value) ?? 0) > 0)
  }, [counts, listId])
  const label = externalRatingLabel(listId)

  function toggle(value: string) {
    const canonical = matchStatus(listId, value).value
    const statuses = statusOn(listId, query.statuses, canonical)
      ? query.statuses.filter((status) => matchStatus(listId, status).value !== canonical)
      : [...query.statuses, canonical]
    onChange({ statuses })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => {
          const on = statusOn(listId, query.statuses, row.value)
          const count = counts.get(row.value) ?? 0
          return (
            <button key={row.value} type="button" aria-pressed={on} className={`inline-flex min-h-16 min-w-28 flex-col items-start justify-center gap-1 border px-3 py-2 text-left transition-colors duration-200 ${SHAPE[listId]} ${on ? 'border-transparent bg-accent text-(--bg)' : 'bg-(--surface) text-(--ink)'}`} onClick={() => toggle(row.value)}>
              <span className="flex items-center gap-1.5 text-sm">
                <StatusGlyph name={row.icon} />
                {row.value}
                {on ? <Check aria-hidden="true" className="size-3.5" /> : null}
              </span>
              <span className="font-(--font-display) text-2xl tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {stats.myRatedCount > 0 && stats.avgMyRating !== null ? (
          <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="size-3.5 text-accent" />{stats.avgMyRating}</span>
        ) : null}
        {stats.externalRatedCount > 0 && stats.avgExternalRating !== null ? (
          <span className="inline-flex items-center gap-1">
            <span className="rounded-sm bg-[#f5c518] px-1 text-[10px] font-bold text-black">{label}</span>
            {stats.avgExternalRating}
          </span>
        ) : null}
        {stats.topGenres.map((genre) => {
          const on = query.genres.includes(genre.genre)
          return (
            <button key={genre.genre} type="button" aria-pressed={on} className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2 text-xs ${on ? 'border-transparent bg-accent text-(--bg)' : 'border-border bg-(--surface)'}`} onClick={() => onChange({ genres: on ? query.genres.filter((value) => value !== genre.genre) : [...query.genres, genre.genre] })}>
              {on ? <Check aria-hidden="true" className="size-3" /> : null}
              {genre.genre}
            </button>
          )
        })}
        <span className="text-xs text-(--ink-muted)">{stats.total} titles</span>
      </div>
      <SegmentedBar
        segments={rows.map((row) => ({ id: row.value, label: row.value, count: counts.get(row.value) ?? 0, tone: TONE[row.family] }))}
        onSelect={toggle}
      />
    </section>
  )
}
