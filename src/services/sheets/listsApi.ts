import type { ListsPayload } from '@/types/media'
import { apiFetch } from '@/services/http/apiFetch'

export async function fetchLists(options?: { refresh?: boolean }): Promise<ListsPayload> {
  const query = options?.refresh === true ? '?refresh=1' : ''
  return apiFetch<ListsPayload>(`/api/lists${query}`)
}
