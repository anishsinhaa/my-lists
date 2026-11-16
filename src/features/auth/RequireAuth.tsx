import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <Skeleton className="m-6 h-10 w-48" />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
