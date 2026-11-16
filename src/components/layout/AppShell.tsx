import { Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

export function AppShell() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Outlet />
      <Toaster />
    </div>
  )
}
