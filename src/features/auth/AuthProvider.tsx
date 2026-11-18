import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '@/types/auth'
import { apiFetch } from '@/services/http/apiFetch'
import { authService } from '@/services/auth/localTokenAuthService'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('checking')

  useEffect(() => {
    localStorage.removeItem('ml.auth.v1')
    let cancelled = false
    apiFetch<{ user: AuthUser }>('/api/auth/me')
      .then((data) => {
        if (cancelled) return
        setUser(data.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setStatus('anonymous')
      void navigate('/login', { replace: true })
    }
    window.addEventListener('ml:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ml:unauthorized', onUnauthorized)
  }, [navigate])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    async login(username, password) {
      const session = await authService.login(username, password)
      setUser(session.user)
      setStatus('authenticated')
    },
    logout() {
      authService.logout()
      setUser(null)
      setStatus('anonymous')
      void navigate('/login', { replace: true })
    },
  }), [navigate, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
