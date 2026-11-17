import { useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { useOnline } from '@/hooks/useOnline'
import type { ThemeId } from '@/types/theme'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { BottomNav } from './BottomNav'
import { PageTransition } from './PageTransition'
import { TopBar } from './TopBar'

function themeFor(pathname: string): ThemeId {
  const listId = /^\/lists\/([^/]+)/.exec(pathname)?.[1]
  if (listId === 'movies' || listId === 'series' || listId === 'anime' || listId === 'games' || listId === 'books') return listId
  if (listId === 'other' || listId === 'curious') return 'other'
  return 'home'
}

export function AppShell() {
  const location = useLocation()
  const online = useOnline()
  return (
    <ThemeProvider themeId={themeFor(location.pathname)}>
      {online ? null : <p className="bg-[var(--accent-2)] px-3 py-2 text-sm text-[var(--bg)]">You are offline. Showing saved lists.</p>}
      <TopBar />
      <ErrorBoundary>
        <div className="pb-20 md:pb-8">
          <PageTransition />
        </div>
      </ErrorBoundary>
      <footer className="px-4 pb-4 text-center text-xs text-[var(--ink-muted)]">
        <a className="underline" href="https://rawg.io" rel="noreferrer">Data: RAWG</a>
      </footer>
      <BottomNav />
      <Toaster />
    </ThemeProvider>
  )
}
