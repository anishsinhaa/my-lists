import type { ItemUpdateRequest, ItemUpdateResult } from '@/types/api'
import { apiFetch } from '@/services/http/apiFetch'

export function saveItem(body: ItemUpdateRequest): Promise<ItemUpdateResult> {
  return apiFetch<ItemUpdateResult>('/api/lists/item', { method: 'POST', body: JSON.stringify(body) })
}
