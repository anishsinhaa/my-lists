import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireOwner } from '@/features/auth/RequireOwner'
import { HomePage } from '@/features/home/HomePage'
import { ShelfPage } from '@/features/home/ShelfPage'
import { ListPage } from '@/features/lists/ListPage'
import { MyListsPage } from '@/features/lists/MyListsPage'
import { PicksPage } from '@/features/picks/PicksPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

function kitLoader() {
  return import('@/features/dev/KitPage').then((module) => ({ Component: module.KitPage }))
}

function NotFound() {
  return <main className="p-6"><h1 className="text-2xl font-semibold">Not found</h1></main>
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/shelf/:tileId', element: <ShelfPage /> },
              { path: '/lists', element: <MyListsPage /> },
              { path: '/lists/:listId', element: <ListPage /> },
              { path: '/picks', element: <PicksPage /> },
              { element: <RequireOwner />, children: [{ path: '/settings', element: <SettingsPage /> }] },
              ...(import.meta.env.DEV ? [{ path: '/dev/kit', lazy: kitLoader }] : []),
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
