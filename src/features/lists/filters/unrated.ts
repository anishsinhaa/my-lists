import { matchStatus } from '@/design/statusConfig'
import type { ListId } from '@/types/lists'

/** Statuses that mean the title has not been started.
 *  "Maybe later" is omitted on purpose: on Series and Anime it means some of it was already watched.
 */
export const UNRATED_EXCLUDED_STATUSES = ['Want to', 'Must watch', 'Maybe', 'Want to buy', 'Bought'] as const

export function isNotStarted(listId: ListId | undefined, status: string): boolean {
  const value = listId === undefined ? status.trim() : matchStatus(listId, status).value
  return UNRATED_EXCLUDED_STATUSES.some((entry) => entry.toLowerCase() === value.toLowerCase())
}

export function isUnratedStarted(listId: ListId | undefined, item: { status: string; myRating: number | null }): boolean {
  if (item.myRating !== null) return false
  const value = listId === undefined ? item.status.trim() : matchStatus(listId, item.status).value
  if (value.length === 0 || value === 'No status') return false
  return !isNotStarted(listId, item.status)
}
