import type { PickStatusRequest, PickStatusResult } from '@/types/api'
import { apiFetch } from '@/services/http/apiFetch'

export function postPickStatus(req: PickStatusRequest): Promise<PickStatusResult> {
  return apiFetch<PickStatusResult>('/api/picks/status', { method: 'POST', body: JSON.stringify(req) })
}
