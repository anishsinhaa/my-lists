import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { ApiErrorCode, ApiResponse } from '../../src/types/api.js'

export function ok<T>(res: VercelResponse, data: T, status = 200): void {
  const body: ApiResponse<T> = { ok: true, data }
  res.status(status).json(body)
}

export function fail(res: VercelResponse, code: ApiErrorCode, message: string, status: number): void {
  const body: ApiResponse<never> = { ok: false, error: { code, message } }
  res.status(status).json(body)
}

export function methodGuard(req: VercelRequest, res: VercelResponse, methods: readonly string[]): boolean {
  if (req.method !== undefined && methods.includes(req.method)) return true
  fail(res, 'bad_request', `Method ${req.method ?? 'unknown'} not allowed`, 405)
  return false
}
