import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { FILTER_CONFIG } from './filters/filterConfig'
import type { GroupKey } from './filters/listQuery'

export function groupOptions(listId: ListId, items: MediaItem[]): { key: GroupKey; label: string }[] {
  const config = FILTER_CONFIG[listId]
  const options: { key: GroupKey; label: string }[] = [
    { key: 'none', label: 'None' },
    { key: 'status', label: 'Status' },
  ]
  if (config.show.genre && items.some((item) => item.genres.length > 0)) options.push({ key: 'genre', label: 'Genre' })
  if (config.show.year && items.some((item) => item.year !== null)) options.push({ key: 'year', label: 'Year' })
  if (config.show.creator && items.some((item) => item.creator !== null && item.creator.length > 0)) options.push({ key: 'creator', label: config.creatorLabel })
  if (config.show.franchise && items.some((item) => item.franchise !== null && item.franchise.length > 0)) options.push({ key: 'franchise', label: config.franchiseLabel })
  if (config.show.platform && items.some((item) => item.platform !== null && item.platform.length > 0)) options.push({ key: 'platform', label: 'Platform' })
  return options
}
