import type { TabId } from '../../src/types/lists.js'

export type WritableField = 'poster' | 'creator' | 'franchise' | 'imdbRating' | 'pickStatus'
const ENRICH: readonly WritableField[] = ['poster', 'creator', 'franchise', 'imdbRating']

export const WRITE_POLICY: Record<TabId, readonly WritableField[]> = {
  movies: ENRICH,
  series: ENRICH,
  anime: ENRICH,
  games: ENRICH,
  books: ENRICH,
  other: [],
  curious: [],
  'movies-picks': ['pickStatus', 'poster'],
  'series-picks': ['pickStatus', 'poster'],
  'games-picks': ['pickStatus', 'poster'],
}

export class WriteForbiddenError extends Error {
  constructor(tab: string, field: string) {
    super(`Cannot write ${field} on ${tab}`)
    this.name = 'WriteForbiddenError'
  }
}

export function assertWritable(tab: TabId, field: WritableField): void {
  if (!WRITE_POLICY[tab].includes(field)) throw new WriteForbiddenError(tab, field)
}

export function assertFillOnly(field: WritableField, expectedCurrent: string, overwrite = false): void {
  if (field === 'pickStatus') return
  if (overwrite) {
    if (field === 'poster' || field === 'imdbRating') return
    throw new WriteForbiddenError(field, 'overwrite')
  }
  if (expectedCurrent !== '') throw new WriteForbiddenError(field, 'expectedCurrent')
}
