import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

function Page({ title }: { title: string }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </main>
  )
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
              { path: '/', element: <Page title="Home" /> },
              { path: '/lists', element: <Page title="My Lists" /> },
              { path: '/lists/:listId', element: <Page title="List" /> },
              { path: '/picks', element: <Page title="Picks" /> },
              { path: '*', element: <Page title="Not found" /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])
