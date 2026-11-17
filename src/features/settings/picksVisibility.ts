import { PICKS_IDS, type PicksId } from '@/types/lists'

export interface PicksEffective {
  movies: boolean
  series: boolean
  games: boolean
}

export function pickTabOn(id: PicksId, effective: PicksEffective): boolean {
  if (id === 'movies-picks') return effective.movies
  if (id === 'series-picks') return effective.series
  return effective.games
}

export function visiblePicks(effective: PicksEffective): PicksId[] {
  return PICKS_IDS.filter((id) => pickTabOn(id, effective))
}
