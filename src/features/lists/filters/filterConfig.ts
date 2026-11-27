import type { ListId } from '@/types/lists'
import { STATUSES } from '@/types/lists'

export interface FilterConfig {
  statuses: readonly string[]
  show: { genre: boolean; year: boolean; franchise: boolean; creator: boolean; platform: boolean; rating: boolean }
  facets?: { type: boolean }
  creatorLabel: string
  franchiseLabel: string
}

const shown = { genre: true, year: true, franchise: true, creator: true, platform: false, rating: true }

export const FILTER_CONFIG: Record<ListId, FilterConfig> = {
  movies: { statuses: STATUSES.movies, show: shown, creatorLabel: 'Director', franchiseLabel: 'Franchise' },
  series: { statuses: STATUSES.series, show: shown, creatorLabel: 'Creator', franchiseLabel: 'Franchise' },
  anime: { statuses: STATUSES.anime, show: shown, creatorLabel: 'Studio/Creator', franchiseLabel: 'Franchise' },
  games: { statuses: STATUSES.games, show: { ...shown, platform: true }, creatorLabel: 'Developer', franchiseLabel: 'Franchise' },
  books: { statuses: [], show: shown, creatorLabel: 'Author', franchiseLabel: 'Series' },
  other: { statuses: [], show: { genre: false, year: false, franchise: false, creator: false, platform: false, rating: false }, facets: { type: true }, creatorLabel: 'Creator', franchiseLabel: 'Franchise' },
  curious: { statuses: [], show: { genre: false, year: false, franchise: false, creator: false, platform: false, rating: false }, facets: { type: true }, creatorLabel: 'Creator', franchiseLabel: 'Franchise' },
}
