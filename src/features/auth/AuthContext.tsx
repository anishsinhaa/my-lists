import { createContext, useContext } from 'react'
import type { AuthUser } from '@/types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'checking' | 'authenticated' | 'anonymous'
  canEdit: boolean
  login(username: string, password: string): Promise<void>
  continueAsGuest(): Promise<void>
  logout(): void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used within AuthProvider')
  return value
}

export function useCanEdit(): boolean {
  const value = useContext(AuthContext)
  return value === null ? true : value.canEdit
}
