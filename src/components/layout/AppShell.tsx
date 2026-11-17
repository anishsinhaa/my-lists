import { useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { useOnline } from '@/hooks/useOnline'
import type { ThemeId } from '@/types/theme'
import { ThemeProvider } from '@/themes/ThemeProvider'
import { EnrichmentRunner } from '@/features/posters/EnrichmentRunner'
import { ArchiveFooter } from './ArchiveFooter'
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
      {online ? null : <p className="bg-(--accent-2) px-3 py-2 text-sm text-(--bg)">You are offline. Showing saved lists.</p>}
      <EnrichmentRunner />
      <TopBar />
      <ErrorBoundary>
        <div id="content" className="pb-28 md:pb-16">
          <PageTransition />
        </div>
      </ErrorBoundary>
      <ArchiveFooter />
      <BottomNav />
      <Toaster />
    </ThemeProvider>
  )
}
