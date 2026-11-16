import { useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
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
  return (
    <ThemeProvider themeId={themeFor(location.pathname)}>
      <TopBar />
      <div className="pb-16 md:pb-0">
        <PageTransition />
      </div>
      <BottomNav />
      <Toaster />
    </ThemeProvider>
  )
}
