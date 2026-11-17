import { CountUp } from '@/components/common/CountUp'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import { TAB_NAME } from '@/types/lists'
import type { ListStats } from './stats/computeStats'

function daysAgo(iso: string | null): string {
  if (iso === null) return 'never updated'
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days <= 0) return 'updated today'
  return `updated ${days} day${days === 1 ? '' : 's'} ago`
}

export function ListHeader({ listId, stats, poster, enriching }: { listId: ListId; stats: ListStats; poster?: string | null; enriching?: string }) {
  const label = externalRatingLabel(listId)
  const groups = (['done', 'active', 'planned', 'waiting', 'paused', 'dropped'] as const).filter((group) => stats.byGroup[group] > 0)
  return (
    <header className="relative overflow-hidden">
      {listId === 'series' && poster !== undefined && poster !== null ? <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-md" src={poster} /> : null}
      {listId === 'anime' ? <div className="halftone h-8" /> : null}
      {listId === 'games' ? <div className="scanlines h-2" /> : null}
      <div className={`relative space-y-2 p-4 ${listId === 'books' ? 'paper' : ''}`}>
        <h2 className={`font-(--font-display) text-4xl ${listId === 'movies' || listId === 'games' ? 'uppercase tracking-[0.06em]' : ''}`}>{TAB_NAME[listId]}</h2>
        {listId === 'games' ? <div className="h-0.5 w-24 bg-accent" /> : null}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span><CountUp value={stats.total} /></span>
          <span>My avg {stats.avgMyRating ?? '–'} ({stats.myRatedCount} rated)</span>
          <span>{label} avg {stats.avgExternalRating ?? '–'} ({stats.externalRatedCount})</span>
          <span className="hidden sm:inline">{stats.topGenres.map((genre) => genre.genre).join(', ')}</span>
          <span>{daysAgo(stats.lastUpdated)}</span>
          {enriching !== undefined ? <span className="rounded-full border px-2 py-0.5">{enriching}</span> : null}
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-(--surface-2)">
          {groups.map((group) => (
            <span key={group} className="origin-left bg-accent" style={{ transform: `scaleX(1)`, width: `${(stats.byGroup[group] / Math.max(stats.total, 1)) * 100}%` }} />
          ))}
        </div>
      </div>
    </header>
  )
}
