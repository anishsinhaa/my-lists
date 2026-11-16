import type { AuthSession, AuthUser } from '@/types/auth'

export type { AuthSession, AuthUser }

export interface AuthService {
  login(username: string, password: string): Promise<AuthSession>
  logout(): void
  getSession(): AuthSession | null
  getToken(): string | null
}
