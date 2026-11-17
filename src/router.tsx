import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { HomePage } from '@/features/home/HomePage'
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
              { path: '/lists', element: <MyListsPage /> },
              { path: '/lists/:listId', element: <ListPage /> },
              { path: '/picks', element: <PicksPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
