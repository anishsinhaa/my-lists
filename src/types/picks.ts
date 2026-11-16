import type { PicksId } from './lists.ts'

export const PICK_STATUS_OPTIONS: Record<PicksId, readonly string[]> = {
  'movies-picks': ['Want to', 'Must watch', 'Maybe', 'Watched'],
  'series-picks': ['Want to', 'On hold', 'Maybe later', 'Watched'],
  'games-picks': ['Want to', 'Played', 'Completed', 'On hold'],
}

export const PICK_SWIPE_MAP: Record<PicksId, { right: string; up: string }> = {
  'movies-picks': { right: 'Want to', up: 'Watched' },
  'series-picks': { right: 'Want to', up: 'Watched' },
  'games-picks': { right: 'Want to', up: 'Played' },
}

export type PickAction = { type: 'status'; status: string } | { type: 'skip' }

export const PICKS_SKIPPED_KEY = 'ml.picksSkipped.v1'
