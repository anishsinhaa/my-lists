import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { StatusGlyph } from '@/design/icons'
import { thumbnailUrl } from '@/design/archive'
import { matchStatus, shelfOrder, statusLabel } from '@/design/statusConfig'
import { displayTitle } from '@/lib/displayTitle'
import { computeStats } from './stats/computeStats'
import type { ListQuery } from './filters/listQuery'
import type { MediaItem } from '@/types/media'

const BANNER_COUNT = 18

export function seriesBannerReel(items: MediaItem[], random: () => number = Math.random): MediaItem[] {
  const posters = items.filter((item) => item.poster !== null && item.poster.length > 0)
  if (posters.length === 0) return []
  const next = [...posters]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[swap]
    next[swap] = current
  }
  const strip = next.slice(0, Math.min(BANNER_COUNT, next.length))
  return [...strip, ...strip]
}

const TONE: Record<string, string> = {
  'in progress': 'series-tone-live',
  'next season out': 'series-tone-next',
  watched: 'series-tone-watched',
  dropped: 'series-tone-dropped',
}

function statusOn(selected: string[], value: string): boolean {
  const canonical = matchStatus('series', value).value
  return selected.some((status) => matchStatus('series', status).value === canonical)
}

export function SeriesSet({ items, query, onChange, note }: {
  items: MediaItem[]
  query: ListQuery
  onChange: (partial: Partial<ListQuery>) => void
  note?: string
}) {
  const stats = useMemo(() => computeStats(items), [items])
  const posterKey = useMemo(() => items.filter((item) => item.poster !== null && item.poster.length > 0).map((item) => item.id).sort().join('|'), [items])
  const [seenKey, setSeenKey] = useState(posterKey)
  const [reel, setReel] = useState(() => seriesBannerReel(items))
  if (posterKey !== seenKey) {
    setSeenKey(posterKey)
    setReel(seriesBannerReel(items))
  }
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const key = matchStatus('series', item.status).value
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [items])
  const rows = useMemo(() => {
    const known = [...shelfOrder('series')]
    const extra = [...counts.keys()].filter((key) => key !== 'No status' && !known.some((row) => row.value === key))
    return [...known, ...extra.map((value) => matchStatus('series', value))].filter((row) => (counts.get(row.value) ?? 0) > 0)
  }, [counts])

  function toggle(value: string) {
    const canonical = matchStatus('series', value).value
    const statuses = statusOn(query.statuses, canonical)
      ? query.statuses.filter((status) => matchStatus('series', status).value !== canonical)
      : [...query.statuses, canonical]
    onChange({ statuses })
  }

  const channels = rows.map((row) => {
    const on = statusOn(query.statuses, row.value)
    const count = counts.get(row.value) ?? 0
    return (
      <button key={row.value} type="button" aria-pressed={on} data-status={row.value} className={`series-channel ${TONE[row.value.toLowerCase()] ?? 'series-tone-amber'} ${on ? 'is-on' : ''}`} onClick={() => toggle(row.value)}>
        <StatusGlyph name={row.icon} />
        <span className="min-w-0">{statusLabel('series', row.value)}</span>
        {on ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
        <span className="tabular-nums">{count}</span>
      </button>
    )
  })

  return (
    <section className="series-set space-y-2">
      <div className="series-antenna" aria-hidden="true" />
      <div className="series-cabinet">
        <div className="series-knobs" aria-hidden="true"><span /><span /></div>
        <div className="series-screen">
          {reel.length > 0 ? (
            <div className="series-reel" style={{ animationDuration: `${Math.max(24, (reel.length / 2) * 2.6)}s` }}>
              {reel.map((item, index) => (
                <PosterImage key={`${item.id}-${index}`} alt="" byline={item.creator ?? ''} className="h-full w-44 shrink-0" fit="fill" kind="series" src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
              ))}
            </div>
          ) : (
            <div className="series-bars" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
          )}
          <div className="series-glow" />
          <div className="series-scan" />
          <div className="series-osd">
            <p>CH 01</p>
            <h2>Series</h2>
          </div>
        </div>
        <div className="series-dials" role="group" aria-label="Status">{channels}</div>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--ink-muted)">
        {stats.topGenres.map((genre) => {
          const on = query.genres.includes(genre.genre)
          return (
            <button key={genre.genre} type="button" aria-pressed={on} className={`rounded-full px-1 ${on ? 'text-(--bg) bg-accent' : ''}`} onClick={() => onChange({ genres: on ? query.genres.filter((value) => value !== genre.genre) : [...query.genres, genre.genre] })}>
              {genre.genre}
            </button>
          )
        })}
        <span>{stats.total} titles</span>
        {note === undefined ? null : <span>{note}</span>}
      </p>
    </section>
  )
}
