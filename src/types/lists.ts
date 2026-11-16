import { normalizeKey } from '../lib/normalize.ts'

export const LIST_IDS = ['movies', 'series', 'anime', 'games', 'books', 'other', 'curious'] as const
export type ListId = (typeof LIST_IDS)[number]

export const PICKS_IDS = ['movies-picks', 'series-picks', 'games-picks'] as const
export type PicksId = (typeof PICKS_IDS)[number]

export type TabId = ListId | PicksId
export type MediaKind = 'movie' | 'series' | 'anime' | 'game' | 'book' | 'other'

export const TAB_NAME: Record<TabId, string> = {
  movies: 'Movies',
  series: 'Series',
  anime: 'Anime',
  games: 'Games',
  books: 'Books',
  other: 'Other',
  curious: 'Curious',
  'movies-picks': 'Movies picks',
  'series-picks': 'Series picks',
  'games-picks': 'Games picks',
}

export const LIST_KIND: Record<ListId, MediaKind> = {
  movies: 'movie',
  series: 'series',
  anime: 'anime',
  games: 'game',
  books: 'book',
  other: 'other',
  curious: 'other',
}

export const POSTER_LISTS: readonly ListId[] = ['movies', 'series', 'anime', 'games', 'books']

export const PICKS_TARGET: Record<PicksId, ListId> = {
  'movies-picks': 'movies',
  'series-picks': 'series',
  'games-picks': 'games',
}

export const STATUSES = {
  series: ['In progress', 'Paused', 'Waiting for next season', 'Rewatch from start', 'Next season out', 'On hold', 'Want to', 'Maybe later', 'Watched', 'Dropped'],
  anime: ['In progress', 'Paused', 'Waiting for next season', 'Rewatch from start', 'Next season out', 'On hold', 'Want to', 'Maybe later', 'Watched', 'Dropped'],
  movies: ['In progress', 'Must watch', 'Want to', 'Maybe', 'Watched', 'Dropped'],
  games: ['Want to', 'Playing', 'Played', 'Completed', 'Dropped', 'Paused', 'Replay from start', 'On hold'],
} as const

export type StatusGroup = 'active' | 'planned' | 'maybe' | 'waiting' | 'paused' | 'done' | 'dropped' | 'unknown'

export const STATUS_GROUP: Record<string, StatusGroup> = {
  'in progress': 'active',
  playing: 'active',
  reading: 'active',
  'rewatch from start': 'active',
  'replay from start': 'active',
  'want to': 'planned',
  'must watch': 'planned',
  maybe: 'maybe',
  'maybe later': 'maybe',
  'waiting for next season': 'waiting',
  'next season out': 'waiting',
  paused: 'paused',
  'on hold': 'paused',
  watched: 'done',
  played: 'done',
  completed: 'done',
  read: 'done',
  dropped: 'dropped',
}

export function statusGroupOf(status: string): StatusGroup {
  return STATUS_GROUP[normalizeKey(status)] ?? 'unknown'
}
