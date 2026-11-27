import type { ListId } from '@/types/lists'

export type StatusFamily = 'active' | 'queue' | 'done' | 'parked' | 'dropped' | 'none'
export type StatusIcon = 'play' | 'pause' | 'check' | 'clock' | 'bookmark' | 'heart' | 'cart' | 'x' | 'spark'

export interface StatusDef {
  value: string
  label?: string
  family: StatusFamily
  icon: StatusIcon
  flavour: string
}

const movie: StatusDef[] = [
  { value: 'In progress', family: 'active', icon: 'play', flavour: 'Now showing' },
  { value: 'Must watch', family: 'queue', icon: 'spark', flavour: 'On the marquee' },
  { value: 'Want to', label: 'Want to watch', family: 'queue', icon: 'bookmark', flavour: 'Waiting in the lobby' },
  { value: 'Maybe', family: 'queue', icon: 'heart', flavour: 'A maybe' },
  { value: 'Watched', family: 'done', icon: 'check', flavour: 'Already screened' },
  { value: 'Dropped', family: 'dropped', icon: 'x', flavour: 'Left the reel' },
]

const series: StatusDef[] = [
  { value: 'In progress', family: 'active', icon: 'play', flavour: 'On the telly' },
  { value: 'Next season out', family: 'queue', icon: 'spark', flavour: 'Something new' },
  { value: 'Waiting for next season', family: 'queue', icon: 'clock', flavour: 'Between seasons' },
  { value: 'Rewatch from start', family: 'active', icon: 'play', flavour: 'From the pilot' },
  { value: 'Paused', family: 'parked', icon: 'pause', flavour: 'Set aside' },
  { value: 'On hold', family: 'parked', icon: 'pause', flavour: 'On hold' },
  { value: 'Want to', label: 'Want to watch', family: 'queue', icon: 'bookmark', flavour: 'Queued' },
  { value: 'Maybe later', family: 'queue', icon: 'heart', flavour: 'Later' },
  { value: 'Watched', family: 'done', icon: 'check', flavour: 'Finished' },
  { value: 'Dropped', family: 'dropped', icon: 'x', flavour: 'Dropped' },
]

const games: StatusDef[] = [
  { value: 'Playing', family: 'active', icon: 'play', flavour: 'In the console' },
  { value: 'Replay from start', family: 'active', icon: 'play', flavour: 'Another run' },
  { value: 'Paused', family: 'parked', icon: 'pause', flavour: 'Paused' },
  { value: 'On hold', family: 'parked', icon: 'pause', flavour: 'On hold' },
  { value: 'Want to', label: 'Want to play', family: 'queue', icon: 'bookmark', flavour: 'On the shelf' },
  { value: 'Played', family: 'done', icon: 'check', flavour: 'Played' },
  { value: 'Completed', family: 'done', icon: 'check', flavour: 'Credits rolled' },
  { value: 'Dropped', family: 'dropped', icon: 'x', flavour: 'Dropped' },
]

const books: StatusDef[] = [
  { value: 'Reading', family: 'active', icon: 'play', flavour: 'On the nightstand' },
  { value: 'On hold', family: 'parked', icon: 'pause', flavour: 'Bookmark left in' },
  { value: 'Want to buy', family: 'queue', icon: 'cart', flavour: 'Not on the shelf yet' },
  { value: 'Bought', family: 'queue', icon: 'bookmark', flavour: 'Waiting to be opened' },
  { value: 'Read', family: 'done', icon: 'check', flavour: 'Back on the shelf' },
]

const ANIME_ORDER = ['In progress', 'Paused', 'Next season out', 'Waiting for next season', 'Rewatch from start', 'On hold', 'Want to', 'Maybe later', 'Watched', 'Dropped']

export const STATUS_TABLE: Record<ListId, readonly StatusDef[]> = {
  movies: movie,
  series,
  anime: ANIME_ORDER.map((value) => {
    const row = series.find((entry) => entry.value === value)
    if (row === undefined) return { value, family: 'none', icon: 'bookmark', flavour: '' }
    return value === 'In progress' ? { ...row, flavour: 'Now streaming' } : row
  }),
  games,
  books,
  other: [],
  curious: [],
}

export const CURRENT_STATUS: Record<ListId, string | null> = {
  movies: 'In progress',
  series: 'In progress',
  anime: 'In progress',
  games: 'Playing',
  books: 'Reading',
  other: null,
  curious: null,
}

const NONE: StatusDef = { value: 'No status', family: 'none', icon: 'bookmark', flavour: 'Unmarked' }

export function statusLabel(listId: ListId, raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return 'No status'
  if (listId === 'curious' && trimmed.toLowerCase() === 'want to') return 'Want to learn'
  const matched = matchStatus(listId, trimmed)
  return matched.label ?? matched.value
}

export function matchStatus(listId: ListId, raw: string): StatusDef {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return NONE
  const found = STATUS_TABLE[listId].find((row) => row.value.toLowerCase() === trimmed.toLowerCase())
  if (found !== undefined) return { ...found, value: found.value }
  return { value: trimmed, family: 'none', icon: 'bookmark', flavour: 'Unmarked' }
}

export function shelfOrder(listId: ListId): readonly StatusDef[] {
  return STATUS_TABLE[listId]
}
