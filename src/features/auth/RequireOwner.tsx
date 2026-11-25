import { Navigate, Outlet } from 'react-router-dom'
import { useCanEdit } from './AuthContext'

export function RequireOwner() {
  if (!useCanEdit()) return <Navigate to="/" replace />
  return <Outlet />
}
