import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { StatusGlyph } from '@/design/icons'
import { currentItems, thumbnailUrl } from '@/design/archive'
import { matchStatus, shelfOrder } from '@/design/statusConfig'
import { computeStats } from './stats/computeStats'
import type { ListQuery } from './filters/listQuery'
import type { MediaItem } from '@/types/media'

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
  const playing = useMemo(() => currentItems('series', items).filter((item) => item.poster !== null), [items])
  const reel = useMemo(() => {
    if (playing.length === 0) return []
    const once: MediaItem[] = []
    const target = Math.max(playing.length, 14)
    while (once.length < target) once.push(...playing)
    return [...once, ...once]
  }, [playing])
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
        <span className="min-w-0 flex-1 truncate text-left">{row.value}</span>
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
            <div className="series-reel">
              {reel.map((item, index) => (
                <img key={`${item.id}-${index}`} alt="" src={thumbnailUrl(item.poster, 'w342') ?? ''} />
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
        <div className="series-side">
          <div className="series-dials">{channels}</div>
        </div>
      </div>
      <div className="series-dials series-dials-row md:hidden">{channels}</div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--ink-muted)">
        {stats.topGenres.map((genre) => {
          const on = query.genres.includes(genre.genre)
          return (
            <button key={genre.genre} type="button" aria-pressed={on} className={`rounded-full px-1 ${on ? 'text-(--bg) bg-(--accent)' : ''}`} onClick={() => onChange({ genres: on ? query.genres.filter((value) => value !== genre.genre) : [...query.genres, genre.genre] })}>
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
