import type { ApiResponse } from '@/types/api'
import type { AuthSession } from '@/types/auth'
import { ApiError } from '@/services/http/apiFetch'
import type { AuthService } from './AuthService'

const KEY = 'ml.auth.v1'
const TIMEOUT_MS = 15_000
const LOGOUT_WAIT_MS = 3_000
const SLOW_MESSAGE = 'The server is taking too long. Try again.'

let pendingLogout: Promise<void> | null = null

function clearStoredToken(): void {
  localStorage.removeItem(KEY)
}

function isLoginResult(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<AuthSession> & { token?: unknown }
  const role = session.user?.role
  return session.token === undefined
    && typeof session.expiresAt === 'string'
    && typeof session.user?.username === 'string'
    && typeof session.user.id === 'string'
    && typeof session.user.accountId === 'string'
    && (role === 'owner' || role === 'guest')
}

async function readSession(response: Response): Promise<AuthSession> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('upstream_error', response.status, response.status === 504 ? 'The server timed out. Try again.' : 'Unexpected response')
  }
  if (typeof payload !== 'object' || payload === null || !('ok' in payload)) {
    throw new ApiError('internal', response.status, 'Unexpected response')
  }
  const body = payload as ApiResponse<AuthSession>
  if (!body.ok) throw new ApiError(body.error.code, response.status, body.error.message)
  if (!isLoginResult(body.data)) throw new ApiError('internal', response.status, 'Unexpected response')
  return body.data
}

function waitForLogout(): Promise<void> {
  const pending = pendingLogout
  if (pending === null) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, LOGOUT_WAIT_MS)
    void pending.finally(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort()
      reject(new ApiError('upstream_error', 0, SLOW_MESSAGE))
    }, TIMEOUT_MS)
    fetch(path, { ...init, credentials: 'include', signal: controller.signal }).then(
      (response) => {
        clearTimeout(timer)
        resolve(response)
      },
      (error: unknown) => {
        clearTimeout(timer)
        if (controller.signal.aborted) reject(new ApiError('upstream_error', 0, SLOW_MESSAGE))
        else reject(error)
      },
    )
  })
}

export const authService: AuthService = {
  clearLocal() {
    clearStoredToken()
  },
  async login(username, password) {
    await waitForLogout()
    clearStoredToken()
    const response = await fetchWithTimeout('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    return readSession(response)
  },
  async guest() {
    await waitForLogout()
    clearStoredToken()
    const response = await fetchWithTimeout('/api/auth/guest', { method: 'POST' })
    return readSession(response)
  },
  logout() {
    clearStoredToken()
    const request = fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() => undefined, () => undefined)
    pendingLogout = request
    void request.finally(() => {
      if (pendingLogout === request) pendingLogout = null
    })
    return request
  },
}
