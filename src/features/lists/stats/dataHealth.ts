import type { MediaItem } from '@/types/media'

export interface DataHealth {
  posters: number
  ratings: number
  creators: number
  franchises: number
}

function blank(value: string | null): boolean {
  return value === null || value.trim().length === 0
}

export function dataHealth(items: MediaItem[]): DataHealth {
  const health: DataHealth = { posters: 0, ratings: 0, creators: 0, franchises: 0 }
  for (const item of items) {
    if (blank(item.poster)) health.posters += 1
    if (item.imdbRating === null) health.ratings += 1
    if (blank(item.creator)) health.creators += 1
    if (blank(item.franchise)) health.franchises += 1
  }
  return health
}
