import type { ApiResponse } from '@/types/api'
import type { AuthSession } from '@/types/auth'
import { readJson } from '@/lib/storage'
import { ApiError } from '@/services/http/apiFetch'
import type { AuthService } from './AuthService'

const KEY = 'ml.auth.v1'

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<AuthSession>
  return typeof session.token === 'string' && typeof session.expiresAt === 'string' && typeof session.user?.username === 'string' && typeof session.user.id === 'string'
}

export const authService: AuthService = {
  async login(username, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const payload: unknown = await response.json()
    if (typeof payload !== 'object' || payload === null || !('ok' in payload)) {
      throw new ApiError('internal', response.status, 'Unexpected response')
    }
    const body = payload as ApiResponse<AuthSession>
    if (!body.ok) throw new ApiError(body.error.code, response.status, body.error.message)
    localStorage.setItem(KEY, JSON.stringify(body.data))
    return body.data
  },
  logout() {
    localStorage.removeItem(KEY)
  },
  getSession() {
    const session = readJson<unknown>(KEY, null)
    if (!isSession(session)) return null
    if (Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(KEY)
      return null
    }
    return session
  },
  getToken() {
    return this.getSession()?.token ?? null
  },
}
