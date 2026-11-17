import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { SortKey } from './filters/listQuery'

export interface SortOption {
  key: SortKey
  label: string
  dir: 'asc' | 'desc'
}

export function hasFinishedColumn(listId: ListId, items: MediaItem[]): boolean {
  if (listId === 'books') return true
  return items.some((item) => Object.prototype.hasOwnProperty.call(item.extra, 'date finished'))
}

export function sortChipLabel(option: SortOption, selected: boolean, dir: 'asc' | 'desc'): string {
  if (!selected) return option.label
  if (option.key === 'title') return dir === 'asc' ? 'Title A–Z' : 'Title Z–A'
  if (option.key === 'year') return dir === 'desc' ? 'Year newest' : 'Year oldest'
  if (option.key === 'finished') return dir === 'desc' ? 'Date finished newest' : 'Date finished oldest'
  return dir === 'desc' ? `${option.label} high–low` : `${option.label} low–high`
}

export function sortOptions(listId: ListId, showFinished: boolean): SortOption[] {
  const external = externalRatingLabel(listId)
  const options: SortOption[] = [
    { key: 'title', label: 'Title', dir: 'asc' },
    { key: 'year', label: 'Year', dir: 'desc' },
    { key: 'myRating', label: 'My Rating', dir: 'desc' },
    { key: 'imdbRating', label: `${external} rating`, dir: 'desc' },
  ]
  if (showFinished) options.push({ key: 'finished', label: 'Date finished', dir: 'desc' })
  return options
}
