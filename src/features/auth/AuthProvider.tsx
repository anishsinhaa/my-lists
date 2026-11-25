import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { canEdit as accountCanEdit, DEFAULT_ACCOUNT_ID, type AuthUser } from '@/types/auth'
import { apiFetch } from '@/services/http/apiFetch'
import { authService } from '@/services/auth/localTokenAuthService'
import { listsCache } from '@/services/sheets/listsCache'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const lastForbidden = useRef(0)
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

  useEffect(() => {
    const onForbidden = () => {
      const now = Date.now()
      if (now - lastForbidden.current < 3000) return
      lastForbidden.current = now
      toast.info('View only. Sign in as the owner to make changes.')
    }
    window.addEventListener('ml:forbidden', onForbidden)
    return () => window.removeEventListener('ml:forbidden', onForbidden)
  }, [])

  const editable = accountCanEdit(user, user?.accountId ?? DEFAULT_ACCOUNT_ID)
  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    canEdit: editable,
    async login(username, password) {
      const session = await authService.login(username, password)
      setUser(session.user)
      setStatus('authenticated')
    },
    async continueAsGuest() {
      const session = await authService.guest()
      setUser(session.user)
      setStatus('authenticated')
    },
    logout() {
      authService.logout()
      listsCache.clear()
      queryClient.clear()
      setUser(null)
      setStatus('anonymous')
      void navigate('/login', { replace: true })
    },
  }), [editable, navigate, queryClient, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
