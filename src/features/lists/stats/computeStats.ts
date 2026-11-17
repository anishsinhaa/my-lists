import type { StatusGroup } from '@/types/lists'
import type { MediaItem } from '@/types/media'

const GROUPS: StatusGroup[] = ['active', 'planned', 'maybe', 'waiting', 'paused', 'done', 'dropped', 'unknown']

export interface ListStats {
  total: number
  byGroup: Record<StatusGroup, number>
  byStatus: Record<string, number>
  avgMyRating: number | null
  myRatedCount: number
  avgExternalRating: number | null
  externalRatedCount: number
  topGenres: { genre: string; count: number }[]
  posterCoverage: number
  lastUpdated: string | null
}

function average(values: number[]): { avg: number | null; count: number } {
  if (values.length === 0) return { avg: null, count: 0 }
  const avg = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  return { avg, count: values.length }
}

export function computeStats(items: MediaItem[]): ListStats {
  const byGroup = Object.fromEntries(GROUPS.map((group) => [group, 0])) as Record<StatusGroup, number>
  const byStatus: Record<string, number> = {}
  const genres = new Map<string, number>()
  let posters = 0
  let lastUpdated: string | null = null
  for (const item of items) {
    byGroup[item.statusGroup] += 1
    if (item.status.length > 0) byStatus[item.status] = (byStatus[item.status] ?? 0) + 1
    if (item.poster !== null) posters += 1
    if (item.updatedAt !== null && (lastUpdated === null || item.updatedAt > lastUpdated)) lastUpdated = item.updatedAt
    for (const genre of item.genres) genres.set(genre, (genres.get(genre) ?? 0) + 1)
  }
  const mine = average(items.flatMap((item) => (item.myRating === null ? [] : [item.myRating])))
  const external = average(items.flatMap((item) => (item.imdbRating === null ? [] : [item.imdbRating])))
  return {
    total: items.length,
    byGroup,
    byStatus,
    avgMyRating: mine.avg,
    myRatedCount: mine.count,
    avgExternalRating: external.avg,
    externalRatedCount: external.count,
    topGenres: [...genres.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([genre, count]) => ({ genre, count })),
    posterCoverage: items.length === 0 ? 0 : posters / items.length,
    lastUpdated,
  }
}
