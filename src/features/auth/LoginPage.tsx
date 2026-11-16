import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { status, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username, password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">My Lists</h1>
          <p className="text-sm text-muted-foreground">Sign in on this device.</p>
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
        <Button type="submit" className="w-full" disabled={submitting || status === 'checking'}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}
