import type { ApiResponse } from '@/types/api'
import type { AuthSession } from '@/types/auth'
import { ApiError } from '@/services/http/apiFetch'
import type { AuthService } from './AuthService'

const KEY = 'ml.auth.v1'

function clearStoredToken(): void {
  localStorage.removeItem(KEY)
}

function isLoginResult(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<AuthSession> & { token?: unknown }
  return session.token === undefined && typeof session.expiresAt === 'string' && typeof session.user?.username === 'string' && typeof session.user.id === 'string'
}

export const authService: AuthService = {
  async login(username, password) {
    clearStoredToken()
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null || !('ok' in payload)) {
      throw new ApiError('internal', response.status, 'Unexpected response')
    }
    const body = payload as ApiResponse<AuthSession>
    if (!body.ok) throw new ApiError(body.error.code, response.status, body.error.message)
    if (!isLoginResult(body.data)) throw new ApiError('internal', response.status, 'Unexpected response')
    return body.data
  },
  logout() {
    clearStoredToken()
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)
  },
}
