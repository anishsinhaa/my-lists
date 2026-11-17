import { normalizeKey } from '@/lib/normalize'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

export const TOP_RATED_MIN = 8
export const PINNED_DIRECTORS = ['Christopher Nolan']
export const PINNED_FRANCHISES = ['Marvel']

export interface SmartViewDef {
  id: string
  label: string
  apply(items: MediaItem[], ctx: { now: Date }): MediaItem[]
  split?: { leftLabel: string; rightLabel: string; left(item: MediaItem): boolean; right(item: MediaItem): boolean }
}

export function topScore(item: { myRating: number | null; imdbRating: number | null }): number | null {
  const scores: number[] = []
  if (item.myRating !== null && item.myRating >= TOP_RATED_MIN) scores.push(item.myRating)
  if (item.imdbRating !== null && item.imdbRating >= TOP_RATED_MIN) scores.push(item.imdbRating)
  if (scores.length === 0) return null
  return Math.max(...scores)
}

function topRated(items: MediaItem[]): MediaItem[] {
  return items
    .map((item, index) => ({ item, index, score: topScore(item) }))
    .filter((row): row is { item: MediaItem; index: number; score: number } => row.score !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((row) => row.item)
}

function recent(items: MediaItem[], now: Date): MediaItem[] {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const fresh = items.filter((item) => item.updatedAt !== null && Date.parse(item.updatedAt) >= cutoff)
  if (fresh.length > 0) return fresh
  return [...items].sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')).slice(0, 20)
}

function statusIs(status: string) {
  return (items: MediaItem[]) => items.filter((item) => item.status === status)
}

const shared = {
  topRated: { id: 'top-rated', label: 'Top rated', apply: (items: MediaItem[]) => topRated(items) },
  recent: { id: 'recent', label: 'Recent', apply: (items: MediaItem[], ctx: { now: Date }) => recent(items, ctx.now) },
}

const nolan = normalizeKey(PINNED_DIRECTORS[0] ?? '')
const marvel = normalizeKey(PINNED_FRANCHISES[0] ?? '')

function isMarvel(item: MediaItem): boolean {
  const franchise = normalizeKey(item.franchise ?? '')
  if (franchise.length === 0) return false
  if (franchise.includes(marvel)) return true
  return franchise.split(' ').includes('mcu')
}

export const SMART_VIEWS: Record<ListId, SmartViewDef[]> = {
  movies: [
    { id: 'nolan', label: 'Nolan', apply: (items) => items.filter((item) => normalizeKey(item.creator ?? '') === nolan) },
    {
      id: 'marvel',
      label: 'Marvel',
      apply: (items) => items.filter((item) => isMarvel(item)),
      split: {
        leftLabel: 'Watched',
        rightLabel: 'Want',
        left: (item) => item.statusGroup === 'done',
        right: (item) => item.statusGroup === 'planned' || item.statusGroup === 'active',
      },
    },
    shared.topRated,
    shared.recent,
    { id: 'must-watch', label: 'Must watch', apply: statusIs('Must watch') },
  ],
  series: [
    { id: 'watching', label: 'Watching', apply: (items) => items.filter((item) => item.statusGroup === 'active') },
    { id: 'waiting', label: 'Waiting', apply: (items) => items.filter((item) => item.statusGroup === 'waiting') },
    { id: 'rewatch', label: 'Rewatch', apply: statusIs('Rewatch from start') },
    shared.topRated,
    shared.recent,
  ],
  anime: [
    { id: 'watching', label: 'Watching', apply: (items) => items.filter((item) => item.statusGroup === 'active') },
    { id: 'next-season-out', label: 'Next season out', apply: statusIs('Next season out') },
    shared.topRated,
    shared.recent,
  ],
  games: [
    { id: 'playing', label: 'Playing', apply: statusIs('Playing') },
    { id: 'backlog', label: 'Backlog', apply: statusIs('Want to') },
    { id: 'completed', label: 'Completed', apply: statusIs('Completed') },
    shared.topRated,
    shared.recent,
  ],
  books: [
    { id: 'reading', label: 'Reading', apply: (items) => items.filter((item) => item.statusGroup === 'active') },
    shared.topRated,
    shared.recent,
  ],
  other: [],
  curious: [],
}
