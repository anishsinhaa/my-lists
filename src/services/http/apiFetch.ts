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

export async function apiFetch<T>(path: string, init?: RequestInit, options?: { timeoutMs?: number; probe?: boolean }): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 20_000
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const external = init?.signal
  if (external != null) {
    if (external.aborted) controller.abort()
    else external.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(path, { ...init, headers, credentials: 'include', signal: controller.signal })
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ApiError('upstream_error', response.status, response.status === 504 ? 'The server timed out. Try again.' : 'Unexpected response')
    }
    if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
      throw new ApiError('internal', response.status, 'Unexpected response')
    }
    const body = payload as ApiResponse<T>
    if (!body.ok) {
      if (response.status === 403 || body.error.code === 'forbidden') {
        window.dispatchEvent(new Event('ml:forbidden'))
      }
      if (response.status === 401 || body.error.code === 'unauthorized') {
        authService.clearLocal()
        if (options?.probe !== true) window.dispatchEvent(new Event('ml:unauthorized'))
      }
      throw new ApiError(body.error.code, response.status, body.error.message)
    }
    return body.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (timedOut) throw new ApiError('upstream_error', 0, 'The server is taking too long. Try again.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
