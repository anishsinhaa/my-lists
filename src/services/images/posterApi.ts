import type { PosterFillItem, PosterFillResult } from '@/types/api'
import { apiFetch } from '@/services/http/apiFetch'

export function fillPosters(items: PosterFillItem[], signal?: AbortSignal): Promise<PosterFillResult[]> {
  return apiFetch<PosterFillResult[]>('/api/posters/fill', { method: 'POST', body: JSON.stringify({ items }), signal })
}
