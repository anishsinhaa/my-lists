import { useEffect, useState, type FormEvent } from 'react'
import { Eye } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BRAND } from '@/config/branding'
import { LogoMark } from '@/design/LogoMark'
import { ApiError } from '@/services/http/apiFetch'
import { useAuth } from './AuthContext'

function safeFrom(state: unknown): string {
  const from = typeof state === 'object' && state !== null && 'from' in state ? state.from : undefined
  if (typeof from !== 'string') return '/'
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/login')) return '/'
  return from
}

export function LoginPage() {
  const { status, user, login, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = safeFrom(location.state)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guestError, setGuestError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [guesting, setGuesting] = useState(false)
  const [slowGuest, setSlowGuest] = useState(false)
  const [guestOff, setGuestOff] = useState(false)

  useEffect(() => {
    if (!guesting) return undefined
    const timer = window.setTimeout(() => setSlowGuest(true), 5000)
    return () => window.clearTimeout(timer)
  }, [guesting])

  if (status === 'authenticated' && user?.role === 'owner') return <Navigate to={destination} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setGuestError(false)
    try {
      await login(username, password)
      void navigate(destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  function runGuest() {
    setGuesting(true)
    setSlowGuest(false)
    setError(null)
    setGuestError(false)
    void continueAsGuest()
      .then(() => navigate(destination, { replace: true }))
      .catch((caught: unknown) => {
        setGuestError(true)
        if (caught instanceof ApiError && caught.code === 'feature_disabled') {
          setGuestOff(true)
          setGuestError(false)
          setError('Guest mode is off.')
          return
        }
        setError(caught instanceof Error ? caught.message : 'Could not open a guest session')
      })
      .finally(() => {
        setGuesting(false)
        setSlowGuest(false)
      })
  }

  return (
    <main data-theme="home" className="relative flex min-h-dvh items-center justify-center bg-[#100e0c] p-6 text-[#f4ead8]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#b08d5744,transparent_42%)]" />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <LogoMark size={64} className="drop-shadow-[0_0_14px_rgba(215,181,106,0.45)]" />
        <form onSubmit={(event) => void onSubmit(event)} className="w-full space-y-4 rounded-xl border border-[#b08d57] bg-[#17130f] p-6 shadow-sm">
          <div>
            <h1 className="font-['Fraunces',serif] text-3xl">{BRAND.name}</h1>
            <p className="text-sm text-[#cbbfa8] italic">{BRAND.tagline}</p>
          </div>
          <label className="block space-y-1 text-sm">
            Username
            <Input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="block space-y-1 text-sm">
            Password
            <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error !== null ? <p className="text-sm text-destructive">{error}</p> : null}
          {guestError ? <button type="button" className="min-h-11 text-sm underline" onClick={runGuest}>Try again</button> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
          {guestOff ? null : (
            <>
              <p className="text-center text-xs text-(--ink-muted)">or</p>
              <Button type="button" variant="outline" className="w-full" disabled={guesting} onClick={runGuest}>
                <Eye aria-hidden="true" className="size-4" />
                {guesting ? 'Opening…' : 'Continue as guest'}
              </Button>
              <p aria-live="polite" className="text-center text-xs text-(--ink-muted)">{guesting ? 'Opening…' : ''}</p>
              {guesting && slowGuest ? <p className="text-center text-xs text-(--ink-muted)">Waking the server up…</p> : null}
              <p className="text-center text-xs text-(--ink-muted)">View only. Nothing can be changed.</p>
            </>
          )}
        </form>
      </div>
    </main>
  )
}
