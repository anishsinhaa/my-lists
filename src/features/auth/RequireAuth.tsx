import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { TopLoadingBar } from '@/components/layout/TopLoadingBar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') {
    return (
      <>
        <TopLoadingBar />
        <main className="edge w-full py-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="mt-4 h-40 w-full" />
          <Skeleton className="mt-4 h-40 w-full" />
        </main>
      </>
    )
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
