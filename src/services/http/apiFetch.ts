import type { ApiErrorCode, ApiResponse } from '@/types/api'
import { authService } from '@/services/auth/localTokenAuthService'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message)
    this.code = code
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const token = authService.getToken()
  if (token !== null) headers.set('authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...init, headers })
  const payload: unknown = await response.json()
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    throw new ApiError('internal', response.status, 'Unexpected response')
  }
  const body = payload as ApiResponse<T>
  if (!body.ok) {
    if (response.status === 401 || body.error.code === 'unauthorized') {
      authService.logout()
      window.dispatchEvent(new Event('ml:unauthorized'))
    }
    throw new ApiError(body.error.code, response.status, body.error.message)
  }
  return body.data
}
