import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { canEdit as accountCanEdit, DEFAULT_ACCOUNT_ID, type AuthUser } from '@/types/auth'
import { apiFetch } from '@/services/http/apiFetch'
import { authService } from '@/services/auth/localTokenAuthService'
import { fetchLists } from '@/services/sheets/listsApi'
import { listsCache } from '@/services/sheets/listsCache'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const lastForbidden = useRef(0)
  const generation = useRef(0)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('checking')

  useEffect(() => {
    localStorage.removeItem('ml.auth.v1')
    const gen = generation.current
    let cancelled = false
    apiFetch<{ user: AuthUser }>('/api/auth/me', undefined, { probe: true, timeoutMs: 10_000 })
      .then((data) => {
        if (cancelled || generation.current !== gen) return
        setUser(data.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled || generation.current !== gen) return
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
      if (location.pathname === '/login') return
      void navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
    }
    window.addEventListener('ml:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ml:unauthorized', onUnauthorized)
  }, [location.pathname, location.search, navigate])

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
      generation.current += 1
      const session = await authService.login(username, password)
      setUser(session.user)
      setStatus('authenticated')
      void queryClient.prefetchQuery({ queryKey: ['lists'], queryFn: () => fetchLists() })
    },
    async continueAsGuest() {
      generation.current += 1
      const session = await authService.guest()
      setUser(session.user)
      setStatus('authenticated')
      void queryClient.prefetchQuery({ queryKey: ['lists'], queryFn: () => fetchLists() })
    },
    logout() {
      generation.current += 1
      void authService.logout()
      listsCache.clear()
      queryClient.clear()
      setUser(null)
      setStatus('anonymous')
      void navigate('/login', { replace: true })
    },
  }), [editable, navigate, queryClient, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
